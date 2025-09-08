import { NextApiRequest, NextApiResponse } from 'next';
import handler from './topics';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { DUMMY_TOPICS } from '@/lib/dummy-data';
import { Topic } from '@/types';

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

describe('/api/topics', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let datastoreTopics: Topic[];

  // Define a persistent mock for the query object
  let mockQueryObject: any;

  beforeEach(() => {
    datastoreTopics = [
      { id: 'ds-topic-1', title: 'DS Topic 1', preview: 'Preview 1', region: 'national', status: 'approved', upvotes: 10, solutions: [] },
      { id: 'ds-topic-2', title: 'DS Topic 2', preview: '2', region: 'local', status: 'approved', upvotes: 5, solutions: [] },
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

    // Default mock for fromDatastore
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
  });

  it('should return all topics from Datastore if available', async () => {
    mockQueryObject.runQuery.mockResolvedValueOnce([
      datastoreTopics.map(t => ({ ...t, [Symbol('__key__')]: { id: t.id } })),
    ]);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockDatastore.createQuery).toHaveBeenCalledWith('Topic');
    expect(mockQueryObject.filter).not.toHaveBeenCalled(); // No filter for all topics
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(datastoreTopics); // Expect the mocked datastore topics
  });

  it('should return topics filtered by region from Datastore', async () => {
    mockQueryObject.runQuery.mockResolvedValueOnce([
      [datastoreTopics[0]].map(t => ({ ...t, [Symbol('__key__')]: { id: t.id } })), // Only return the national topic
    ]);

    mockReq.query = { region: 'national' };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockDatastore.createQuery).toHaveBeenCalledWith('Topic');
    expect(mockQueryObject.filter).toHaveBeenCalledWith('region', '=', 'national'); // Assert on the persistent mock
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([datastoreTopics[0]]); // Expect only the filtered topic
  });

  it('should fall back to dummy data if Datastore returns no topics', async () => {
    mockQueryObject.runQuery.mockResolvedValueOnce([[]]); // No entities from Datastore

    // Temporarily modify DUMMY_TOPICS for this test
    const originalDummyTopics = [...DUMMY_TOPICS];
    DUMMY_TOPICS.length = 0; // Clear it
    DUMMY_TOPICS.push(
      { id: 'd-p-1', title: 'Dummy Pending', preview: '', region: 'local', status: 'pending', upvotes: 0 },
      { id: 'd-a-1', title: 'Dummy Approved', preview: '', region: 'local', status: 'approved', upvotes: 0 },
    );

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(DUMMY_TOPICS);

    // Restore original DUMMY_TOPICS
    DUMMY_TOPICS.length = 0;
    DUMMY_TOPICS.push(...originalDummyTopics);
  });

  it('should fall back to filtered dummy data if Datastore returns no topics for a region', async () => {
    mockQueryObject.runQuery.mockResolvedValueOnce([[]]); // No entities from Datastore

    mockReq.query = { region: 'local' };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    const expectedDummyTopics = DUMMY_TOPICS.filter(t => t.region === 'local');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expectedDummyTopics);
  });

  it('should fall back to dummy data if Datastore query fails', async () => {
    mockQueryObject.runQuery.mockRejectedValueOnce(new Error('Datastore error'));

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(DUMMY_TOPICS);
  });

  it('should return 405 for non-GET requests', async () => {
    mockReq.method = 'POST';

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET']); // Corrected from ['POST']
    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.end).toHaveBeenCalledWith('Method POST Not Allowed');
  });
});