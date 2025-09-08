import { NextApiRequest, NextApiResponse } from 'next';
import handler from './approve-reject';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Comment } from '@/types';

// Mock Datastore
jest.mock('@/lib/datastoreServer', () => {
  const mockFilter = jest.fn().mockReturnThis();
  const mockRunQuery = jest.fn();
  const mockGet = jest.fn();

  const mockDatastoreInstance = {
    createQuery: jest.fn(() => ({
      filter: mockFilter,
      runQuery: mockRunQuery,
    })),
    key: jest.fn((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id } })),
    save: jest.fn(),
    get: mockGet,
    runQuery: mockRunQuery, // This is not used for createQuery chain
    KEY: Symbol('__key__'),
    int: jest.fn((val: string) => parseInt(val, 10)),
  };
  return {
    datastore: mockDatastoreInstance,
    fromDatastore: jest.fn((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    })),
    DATASTORE_NAMESPACE: 'civic-engagement',
  };
});

import { datastore as mockDatastore, fromDatastore as mockFromDatastore } from '@/lib/datastoreServer';

describe('/api/admin/comments/approve-reject', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let testComment: Comment;

  beforeEach(() => {
    testComment = {
      id: 'pending-comment-1',
      text: 'This is a pending comment.',
      author: { id: 'user-1', displayName: 'Test User', badges: [] },
      timestamp: new Date().toISOString(),
      parentId: null,
      flags: 3,
      status: 'pending',
    };

    mockReq = { method: 'POST', body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    jest.clearAllMocks();

    mockDatastore.key.mockImplementation((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id } }));
    mockDatastore.get.mockImplementation((key: any) => {
      // Handle both string and number IDs for comparison
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'Comment' && requestedId === testComment.id) {
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testComment)), [Symbol('__key__')]: { id: testComment.id } }]);
      }
      return Promise.resolve([null]);
    });
    mockDatastore.save.mockResolvedValueOnce(undefined);
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
  });

  it('should approve a comment and clear flags if admin', async () => {
    mockReq.body = { commentId: testComment.id, status: 'approved', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Comment ${testComment.id} approved.`,
      comment: expect.objectContaining({ status: 'approved', flags: 0 }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1);
    expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
      key: expect.objectContaining({ id: testComment.id }),
      data: expect.objectContaining({ status: 'approved', flags: 0, id: undefined }),
    }));
  });

  it('should reject a comment and clear flags if admin', async () => {
    mockReq.body = { commentId: testComment.id, status: 'rejected', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Comment ${testComment.id} rejected.`,
      comment: expect.objectContaining({ status: 'rejected', flags: 0 }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1);
    expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
      key: expect.objectContaining({ id: testComment.id }),
      data: expect.objectContaining({ status: 'rejected', flags: 0, id: undefined }),
    }));
  });

  it('should return 403 if not admin', async () => {
    mockReq.body = { commentId: testComment.id, status: 'approved', isAdmin: false };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: Admin access required.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
    expect(mockDatastore.get).not.toHaveBeenCalled();
  });

  it('should return 400 if missing commentId or invalid status', async () => {
    mockReq.body = { status: 'approved', isAdmin: true }; // Missing commentId

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing commentId or invalid status.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
  });

  it('should return 404 if comment not found', async () => {
    mockDatastore.get.mockResolvedValueOnce([null]); // Comment not found
    mockReq.body = { commentId: 'non-existent-comment', status: 'approved', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Comment not found.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
  });

  it('should return 405 for non-POST requests', async () => {
    mockReq.method = 'GET';
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
  });
});