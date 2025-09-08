import { NextApiRequest, NextApiResponse } from 'next';
import handler from './approve-reject';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic, Solution } from '@/types';

// Mock Datastore
jest.mock('@/lib/datastoreServer', () => {
  const mockFilter = jest.fn().mockReturnThis();
  const mockRunQuery = jest.fn();
  const mockGet = jest.fn();
  const mockSave = jest.fn();

  const mockDatastoreInstance = {
    createQuery: jest.fn(() => ({
      filter: mockFilter,
      runQuery: mockRunQuery,
    })),
    key: jest.fn((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id } })),
    save: mockSave,
    get: mockGet,
    delete: jest.fn(),
    runQuery: mockRunQuery,
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

describe('/api/admin/solutions/approve-reject', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let testTopic: Topic;

  beforeEach(() => {
    testTopic = {
      id: 'topic-with-solutions',
      title: 'Topic with Solutions',
      preview: 'Preview',
      region: 'national',
      problemStatement: 'Problem',
      status: 'approved',
      upvotes: 10,
      solutions: [
        { id: 'sol-1', title: 'Solution One', description: 'Desc One', status: 'pending', votes: 0 },
        { id: 'sol-2', title: 'Solution Two', description: 'Desc Two', status: 'approved', votes: 5 },
      ],
      flags: 0,
    };

    mockReq = { method: 'POST', body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    jest.clearAllMocks();

    // Reset all mocks for each test
    mockDatastore.key.mockClear();
    mockDatastore.save.mockClear();
    mockDatastore.get.mockClear();
    mockFromDatastore.mockClear();

    mockDatastore.key.mockImplementation((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id: id || 'generated-id' } }));
    
    // Mock datastore.get to return the testTopic when queried
    mockDatastore.get.mockImplementation((key: any) => {
      // Handle both string and number IDs for comparison
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'Topic' && requestedId === testTopic.id) {
        // Return a deep copy to prevent modification by the handler affecting other tests
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testTopic)), [Symbol('__key__')]: { id: testTopic.id } }]);
      }
      return Promise.resolve([null]);
    });
    
    mockDatastore.save.mockResolvedValue(undefined);
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
  });

  it('should approve a pending solution if admin', async () => {
    mockReq.body = { topicId: testTopic.id, solutionId: 'sol-1', status: 'approved', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Solution sol-1 for topic ${testTopic.id} approved.`,
      topic: expect.objectContaining({
        solutions: expect.arrayContaining([
          expect.objectContaining({ id: 'sol-1', status: 'approved' }),
        ]),
      }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1);
    expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
      key: expect.objectContaining({ id: testTopic.id }),
      data: expect.objectContaining({
        solutions: expect.arrayContaining([
          expect.objectContaining({ id: 'sol-1', status: 'approved' }),
        ]),
        id: undefined,
      }),
    }));
  });

  it('should reject an approved solution if admin', async () => {
    mockReq.body = { topicId: testTopic.id, solutionId: 'sol-2', status: 'rejected', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Solution sol-2 for topic ${testTopic.id} rejected.`,
      topic: expect.objectContaining({
        solutions: expect.arrayContaining([
          expect.objectContaining({ id: 'sol-2', status: 'rejected' }),
        ]),
      }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1);
    expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
      key: expect.objectContaining({ id: testTopic.id }),
      data: expect.objectContaining({
        solutions: expect.arrayContaining([
          expect.objectContaining({ id: 'sol-2', status: 'rejected' }),
        ]),
        id: undefined,
      }),
    }));
  });

  it('should return 403 if not admin', async () => {
    mockReq.body = { topicId: testTopic.id, solutionId: 'sol-1', status: 'approved', isAdmin: false };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: Admin access required.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
    expect(mockDatastore.get).not.toHaveBeenCalled();
  });

  it('should return 400 if missing required fields', async () => {
    mockReq.body = { topicId: testTopic.id, status: 'approved', isAdmin: true }; // Missing solutionId

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing topicId, solutionId, or invalid status.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
  });

  it('should return 404 if topic not found', async () => {
    mockDatastore.get.mockResolvedValueOnce([null]); // Topic not found for this specific test
    mockReq.body = { topicId: 'non-existent-topic', solutionId: 'sol-1', status: 'approved', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Topic not found.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
  });

  it('should return 404 if solution not found within topic', async () => {
    // Mock get to return the topic, but the solution ID won't match
    mockDatastore.get.mockImplementationOnce((key: any) => {
      // Handle both string and number IDs for comparison
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'Topic' && requestedId === testTopic.id) {
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testTopic)), [Symbol('__key__')]: { id: testTopic.id } }]);
      }
      return Promise.resolve([null]);
    });
    mockReq.body = { topicId: testTopic.id, solutionId: 'non-existent-sol', status: 'approved', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Solution not found within topic.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
  });

  it('should return 405 for non-POST requests', async () => {
    mockReq.method = 'GET';
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
  });
});