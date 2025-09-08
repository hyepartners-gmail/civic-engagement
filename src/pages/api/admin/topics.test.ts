import { NextApiRequest, NextApiResponse } from 'next';
import createHandler from './topics/create';
import updateHandler from './topics/update';
import deleteHandler from './topics/delete';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic } from '@/types';

// Mock Datastore
jest.mock('@/lib/datastoreServer', () => {
  const mockFilter = jest.fn().mockReturnThis();
  const mockRunQuery = jest.fn();
  const mockGet = jest.fn();
  const mockSave = jest.fn();
  const mockDelete = jest.fn();

  const mockDatastoreInstance = {
    key: jest.fn((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id } })),
    save: mockSave,
    get: mockGet,
    delete: mockDelete,
    runQuery: mockRunQuery, // This is not used for createQuery chain
    createQuery: jest.fn(() => ({
      filter: mockFilter,
      runQuery: mockRunQuery,
    })),
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

describe('Admin Topic Management APIs', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let testTopic: Topic;

  beforeEach(() => {
    // Define test data inside beforeEach to ensure a fresh state for each test
    testTopic = {
      id: 'existing-topic-1',
      title: 'Existing Topic',
      preview: 'Existing Preview',
      region: 'national',
      problemStatement: 'Existing Problem',
      status: 'approved',
      upvotes: 10,
      solutions: [],
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
    mockDatastore.delete.mockClear();
    mockFromDatastore.mockClear();

    // Default mock implementations for Datastore
    mockDatastore.key.mockImplementation((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id: id || 'generated-id' } }));
    
    // Mock for datastore.save for create handler
    mockDatastore.save.mockImplementation((entity: any) => {
      // For new entities (no ID in key initially), simulate ID generation
      if (!entity.key[Symbol('__key__')]?.id) {
        entity.key[Symbol('__key__')].id = 'new-generated-id';
      }
      return Promise.resolve([{ key: entity.key }]);
    });

    // Mock for datastore.get for update/delete handlers
    mockDatastore.get.mockImplementation((key: any) => {
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'Topic' && requestedId === testTopic.id) {
        return Promise.resolve([{ ...testTopic, [Symbol('__key__')]: { id: testTopic.id } }]);
      }
      return Promise.resolve([null]);
    });
    
    mockDatastore.delete.mockResolvedValue(undefined);
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
  });

  describe('Create Topic API (/api/admin/topics/create)', () => {
    it('should create a new topic if admin', async () => {
      mockReq.body = {
        title: 'New Topic',
        preview: 'New Preview',
        region: 'local',
        problemStatement: 'New Problem Statement',
        isAdmin: true,
      };

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Topic created successfully.',
        topic: expect.objectContaining({
          title: 'New Topic',
          status: 'approved',
          id: 'new-generated-id', // Expect the mocked generated ID
        }),
      }));
      expect(mockDatastore.save).toHaveBeenCalledTimes(1);
      expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'approved' }),
      }));
    });

    it('should return 403 if not admin', async () => {
      mockReq.body = {
        title: 'New Topic',
        preview: 'New Preview',
        region: 'local',
        problemStatement: 'New Problem Statement',
        isAdmin: false, // Not admin
      };

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: Admin access required.' });
      expect(mockDatastore.save).not.toHaveBeenCalled();
    });

    it('should return 400 if missing required fields', async () => {
      mockReq.body = {
        title: 'New Topic',
        isAdmin: true, // Missing other fields
      };

      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing required topic fields.' });
      expect(mockDatastore.save).not.toHaveBeenCalled();
    });

    it('should return 405 for non-POST requests', async () => {
      mockReq.method = 'GET';
      await createHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
      expect(mockRes.status).toHaveBeenCalledWith(405);
    });
  });

  describe('Update Topic API (/api/admin/topics/update)', () => {
    it('should update an existing topic if admin', async () => {
      mockReq.method = 'PUT';
      mockReq.body = {
        id: testTopic.id,
        title: 'Updated Topic Title',
        status: 'pending', // Can change status
        isAdmin: true,
      };

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Topic updated successfully.',
        topic: expect.objectContaining({
          id: testTopic.id,
          title: 'Updated Topic Title',
          status: 'pending',
          preview: testTopic.preview, // Other fields should remain
        }),
      }));
      expect(mockDatastore.get).toHaveBeenCalledWith(expect.objectContaining({ id: testTopic.id }));
      expect(mockDatastore.save).toHaveBeenCalledTimes(1);
      expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
        key: expect.objectContaining({ id: testTopic.id }),
        data: expect.objectContaining({ title: 'Updated Topic Title', status: 'pending', id: undefined }),
      }));
    });

    it('should return 403 if not admin', async () => {
      mockReq.method = 'PUT';
      mockReq.body = {
        id: testTopic.id,
        title: 'Updated Topic Title',
        isAdmin: false, // Not admin
      };

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: Admin access required.' });
      expect(mockDatastore.get).not.toHaveBeenCalled();
      expect(mockDatastore.save).not.toHaveBeenCalled();
    });

    it('should return 400 if missing topic ID', async () => {
      mockReq.method = 'PUT';
      mockReq.body = {
        title: 'Updated Topic Title',
        isAdmin: true, // Missing ID
      };

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing topic ID for update.' });
      expect(mockDatastore.get).not.toHaveBeenCalled();
      expect(mockDatastore.save).not.toHaveBeenCalled();
    });

    it('should return 404 if topic not found', async () => {
      mockDatastore.get.mockResolvedValueOnce([null]); // Topic not found for this specific test
      mockReq.method = 'PUT';
      mockReq.body = {
        id: 'non-existent-id',
        title: 'Updated Topic Title',
        isAdmin: true,
      };

      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Topic not found.' });
      expect(mockDatastore.save).not.toHaveBeenCalled();
    });

    it('should return 405 for non-PUT requests', async () => {
      mockReq.method = 'POST';
      await updateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['PUT']);
      expect(mockRes.status).toHaveBeenCalledWith(405);
    });
  });

  describe('Delete Topic API (/api/admin/topics/delete)', () => {
    it('should delete a topic if admin', async () => {
      mockReq.method = 'DELETE';
      mockReq.body = {
        id: testTopic.id,
        isAdmin: true,
      };

      await deleteHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Topic deleted successfully.' });
      expect(mockDatastore.delete).toHaveBeenCalledTimes(1);
      // Expect the key object to contain the ID in its Symbol property
      expect(mockDatastore.delete).toHaveBeenCalledWith(
        expect.objectContaining({ [Symbol('__key__')]: expect.objectContaining({ id: testTopic.id }) })
      );
    });

    it('should return 403 if not admin', async () => {
      mockReq.method = 'DELETE';
      mockReq.body = {
        id: testTopic.id,
        isAdmin: false, // Not admin
      };

      await deleteHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: Admin access required.' });
      expect(mockDatastore.delete).not.toHaveBeenCalled();
    });

    it('should return 400 if missing topic ID', async () => {
      mockReq.method = 'DELETE';
      mockReq.body = {
        isAdmin: true, // Missing ID
      };

      await deleteHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing topic ID for deletion.' });
      expect(mockDatastore.delete).not.toHaveBeenCalled();
    });

    it('should return 405 for non-DELETE requests', async () => {
      mockReq.method = 'POST';
      await deleteHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['DELETE']);
      expect(mockRes.status).toHaveBeenCalledWith(405);
    });
  });
});