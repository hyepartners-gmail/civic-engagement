import { NextApiRequest, NextApiResponse } from 'next';
import handler from './pending';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';
import { DUMMY_TOPICS } from '@/lib/dummy-data';

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
    get: jest.fn(), // Mock get for consistency
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

// Mock DUMMY_TOPICS to ensure tests use controlled data
jest.mock('@/lib/dummy-data', () => ({
  DUMMY_TOPICS: [], // Start with an empty array for controlled testing
}));

import { datastore as mockDatastore, fromDatastore as mockFromDatastore } from '@/lib/datastoreServer';

describe('/api/admin/suggestions/pending', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let datastorePendingTopics: Topic[];

  // Define a persistent mock for the query object
  let mockQueryObject: any;

  beforeEach(() => {
    datastorePendingTopics = [
      { id: 'ds-pending-1', title: 'DS Pending 1', preview: '', region: 'local', status: 'pending', upvotes: 0 },
      { id: 'ds-pending-2', title: 'DS Pending 2', preview: '', region: 'national', status: 'pending', upvotes: 0 },
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

    mockDatastore.key.mockImplementation((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id: id || 'generated-id' } }));
    mockDatastore.save.mockResolvedValue(undefined);
    mockDatastore.get.mockResolvedValue([null]); // Default to not found for get
    
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
  });

  it('should return pending topics from Datastore if admin', async () => {
    mockReq.query = { isAdmin: 'true' };
    // Mock the runQuery method of the persistent query object
    mockQueryObject.runQuery.mockResolvedValueOnce([
      datastorePendingTopics.map(t => ({ ...t, [Symbol('__key__')]: { id: t.id } })),
    ]);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockDatastore.createQuery).toHaveBeenCalledWith('Topic');
    expect(mockQueryObject.filter).toHaveBeenCalledWith('status', '=', 'pending'); // Assert on the persistent mock
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ pendingTopics: datastorePendingTopics });
  });

  it('should fall back to dummy data if Datastore returns no pending topics', async () => {
    mockReq.query = { isAdmin: 'true' };
    mockQueryObject.runQuery.mockResolvedValueOnce([[]]); // No entities from Datastore

    // Temporarily modify DUMMY_TOPICS for this test
    const originalDummyTopics = [...DUMMY_TOPICS];
    DUMMY_TOPICS.length = 0; // Clear it
    DUMMY_TOPICS.push(
      { id: 'd-p-1', title: 'Dummy Pending', preview: '', region: 'local', status: 'pending', upvotes: 0 },
      { id: 'd-a-1', title: 'Dummy Approved', preview: '', region: 'local', status: 'approved', upvotes: 0 },
    );

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200); // Expect 200, not 500
    expect(mockRes.json).toHaveBeenCalledWith({
      pendingTopics: [expect.objectContaining({ id: 'd-p-1' })],
    });

    // Restore original DUMMY_TOPICS
    DUMMY_TOPICS.length = 0;
    DUMMY_TOPICS.push(...originalDummyTopics);
  });

  it('should return 403 if not admin', async () => {
    mockReq.query = { isAdmin: 'false' }; // Not admin
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: Admin access required.' });
    // Ensure createQuery was NOT called if unauthorized
    expect(mockDatastore.createQuery).not.toHaveBeenCalled();
  });

  it('should return 405 for non-GET requests', async () => {
    mockReq.method = 'POST';
    mockReq.query = { isAdmin: 'true' };
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
  });
});