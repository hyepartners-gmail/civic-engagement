import { NextApiRequest, NextApiResponse } from 'next';
import handler from './comments';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { DUMMY_COMMENTS } from '@/lib/dummy-data';
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

// Mock DUMMY_COMMENTS to ensure tests use controlled data
jest.mock('@/lib/dummy-data', () => ({
  DUMMY_COMMENTS: [], // Start with an empty array for controlled testing
}));

import { datastore as mockDatastore, fromDatastore as mockFromDatastore } from '@/lib/datastoreServer';

describe('/api/comments', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let datastoreComments: Comment[];

  // Define a persistent mock for the query object
  let mockQueryObject: any;

  beforeEach(() => {
    datastoreComments = [
      { id: 'ds-comment-1', text: 'Approved comment', author: { id: 'u1', displayName: 'User1', badges: [] }, timestamp: '2023-01-01T00:00:00Z', parentId: null, flags: 0, status: 'approved' },
      { id: 'ds-comment-2', text: 'Pending comment', author: { id: 'u2', displayName: 'User2', badges: [] }, timestamp: '2023-01-01T00:01:00Z', parentId: null, flags: 0, status: 'pending' },
      { id: 'ds-comment-3', text: 'Rejected comment', author: { id: 'u3', displayName: 'User3', badges: [] }, timestamp: '2023-01-01T00:02:00Z', parentId: null, flags: 0, status: 'rejected' },
      { id: 'ds-comment-4', text: 'Comment with no status', author: { id: 'u4', displayName: 'User4', badges: [] }, timestamp: '2023-01-01T00:03:00Z', parentId: null, flags: 0 }, // Implicitly approved
    ];

    mockReq = { method: 'GET', query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    jest.clearAllMocks();

    // Create a persistent mock query object
    mockQueryObject = {
      filter: jest.fn().mockReturnThis(),
      runQuery: jest.fn(),
    };
    mockDatastore.createQuery.mockReturnValue(mockQueryObject); // Always return this same object

    // Default mock for fromDatastore
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
  });

  it('should return only approved comments from Datastore', async () => {
    mockQueryObject.runQuery.mockResolvedValueOnce([
      datastoreComments.map(c => ({ ...c, [Symbol('__key__')]: { id: c.id } })),
    ]);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockDatastore.createQuery).toHaveBeenCalledWith('Comment');
    // No filter is applied in the API for GET /api/comments, only in the API for admin/comments
    expect(mockQueryObject.filter).not.toHaveBeenCalled(); 
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'ds-comment-1' }),
      expect.objectContaining({ id: 'ds-comment-4' }),
    ]);
    expect(mockRes.json).not.toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'ds-comment-2' }),
      expect.objectContaining({ id: 'ds-comment-3' }),
    ]));
  });

  it('should fall back to filtered dummy data if Datastore returns no comments', async () => {
    mockQueryObject.runQuery.mockResolvedValueOnce([[]]); // No entities from Datastore

    // Temporarily modify DUMMY_COMMENTS for this test
    const originalDummyComments = [...DUMMY_COMMENTS];
    DUMMY_COMMENTS.length = 0; // Clear it
    DUMMY_COMMENTS.push(
      { id: 'd-c-1', text: 'Dummy Approved', author: { id: 'u1', displayName: 'DUser1', badges: [] }, timestamp: '', parentId: null, flags: 0, status: 'approved' },
      { id: 'd-c-2', text: 'Dummy Pending', author: { id: 'u2', displayName: 'DUser2', badges: [] }, timestamp: '', parentId: null, flags: 0, status: 'pending' },
      { id: 'd-c-3', text: 'Dummy No Status', author: { id: 'u3', displayName: 'DUser3', badges: [] }, timestamp: '', parentId: null, flags: 0 },
    );

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'd-c-1' }),
      expect.objectContaining({ id: 'd-c-3' }),
    ]);
    expect(mockRes.json).not.toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'd-c-2' }),
    ]));

    // Restore original DUMMY_COMMENTS
    DUMMY_COMMENTS.length = 0;
    DUMMY_COMMENTS.push(...originalDummyComments);
  });

  it('should fall back to filtered dummy data if Datastore query fails', async () => {
    mockQueryObject.runQuery.mockRejectedValueOnce(new Error('Datastore error'));

    // Temporarily modify DUMMY_COMMENTS for this test
    const originalDummyComments = [...DUMMY_COMMENTS];
    DUMMY_COMMENTS.length = 0; // Clear it
    DUMMY_COMMENTS.push(
      { id: 'd-c-1', text: 'Dummy Approved', author: { id: 'u1', displayName: 'DUser1', badges: [] }, timestamp: '', parentId: null, flags: 0, status: 'approved' },
      { id: 'd-c-2', text: 'Dummy Pending', author: { id: 'u2', displayName: 'DUser2', badges: [] }, timestamp: '', parentId: null, flags: 0, status: 'pending' },
    );

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'd-c-1' }),
    ]);

    // Restore original DUMMY_COMMENTS
    DUMMY_COMMENTS.length = 0;
    DUMMY_COMMENTS.push(...originalDummyComments);
  });

  it('should return 405 for non-GET requests', async () => {
    mockReq.method = 'POST';

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET']); // Corrected from ['POST']
    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.end).toHaveBeenCalledWith('Method POST Not Allowed');
  });
});