import { NextApiRequest, NextApiResponse } from 'next';
import handler from './approve-reject';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Topic, User } from '@/types';
import { checkAndAwardBadges, saveUserToDatastore } from '@/lib/badgeService';

// Mock Datastore and badgeService
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

jest.mock('@/lib/badgeService', () => ({
  checkAndAwardBadges: jest.fn((user: User) => user),
  saveUserToDatastore: jest.fn(),
}));

import { datastore as mockDatastore, fromDatastore as mockFromDatastore } from '@/lib/datastoreServer';
import { checkAndAwardBadges as mockCheckAndAwardBadges, saveUserToDatastore as mockSaveUserToDatastore } from '@/lib/badgeService';

describe('/api/admin/suggestions/approve-reject', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let testTopic: Topic;
  let testUser: User;

  beforeEach(() => {
    // Define test data inside beforeEach to ensure a fresh state for each test
    testTopic = {
      id: 'pending-topic-1',
      title: 'Pending Topic',
      preview: 'Preview',
      region: 'local',
      problemStatement: 'Problem',
      status: 'pending',
      upvotes: 5,
      solutions: [],
      flags: 0,
      suggesterId: 'suggester-user-1',
    };

    testUser = {
      id: 'suggester-user-1',
      email: 'suggester@example.com',
      displayName: 'Suggester User',
      isVerified: true,
      votesCast: 0,
      totalComments: 0,
      totalSolutionVotes: 0,
      approvedSuggestions: 0,
      totalUpvotes: 0,
      badges: [],
      badgeProgress: [],
      votedSolutions: [],
      isMuted: false,
      lastActivityDate: new Date().toISOString(),
      currentStreak: 0,
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
    mockCheckAndAwardBadges.mockClear();
    mockSaveUserToDatastore.mockClear();

    mockDatastore.key.mockImplementation((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id: id || 'generated-id' } }));
    mockDatastore.save.mockResolvedValue(undefined); // Default successful save
    mockSaveUserToDatastore.mockResolvedValue(undefined); // Default successful user save
    mockCheckAndAwardBadges.mockImplementation((user: User) => user); // Reset to default behavior

    // Dynamic mock for datastore.get
    mockDatastore.get.mockImplementation((key: any) => {
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'Topic' && requestedId === testTopic.id) {
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testTopic)), [Symbol('__key__')]: { id: testTopic.id } }]);
      }
      if (key.kind === 'User' && requestedId === testUser.id) {
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testUser)), [Symbol('__key__')]: { id: testUser.id } }]);
      }
      return Promise.resolve([null]); // Default for not found
    });

    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
  });

  it('should approve a topic and update suggester user if admin', async () => {
    mockReq.body = { topicId: testTopic.id, status: 'approved', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Topic ${testTopic.id} approved.`,
      topic: expect.objectContaining({ status: 'approved' }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1); // Topic save
    expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
      key: expect.objectContaining({ id: testTopic.id }),
      data: expect.objectContaining({ status: 'approved', id: undefined }),
    }));
    expect(mockCheckAndAwardBadges).toHaveBeenCalledWith(expect.objectContaining({
      approvedSuggestions: 1, // Should be incremented
    }));
    expect(mockSaveUserToDatastore).toHaveBeenCalledTimes(1); // User save
  });

  it('should reject a topic if admin', async () => {
    mockReq.body = { topicId: testTopic.id, status: 'rejected', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Topic ${testTopic.id} rejected.`,
      topic: expect.objectContaining({ status: 'rejected' }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1); // Topic save
    expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
      key: expect.objectContaining({ id: testTopic.id }),
      data: expect.objectContaining({ status: 'rejected', id: undefined }),
    }));
    expect(mockCheckAndAwardBadges).not.toHaveBeenCalled(); // Not called on rejection
    expect(mockSaveUserToDatastore).not.toHaveBeenCalled(); // Not called on rejection
  });

  it('should return 403 if not admin', async () => {
    mockReq.body = { topicId: testTopic.id, status: 'approved', isAdmin: false };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: Admin access required.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
    expect(mockDatastore.get).not.toHaveBeenCalled();
  });

  it('should return 400 if missing topicId or invalid status', async () => {
    mockReq.body = { status: 'approved', isAdmin: true }; // Missing topicId

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing topicId or invalid status.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
  });

  it('should return 404 if topic not found', async () => {
    mockDatastore.get.mockResolvedValueOnce([null]); // Topic not found for this specific test
    mockReq.body = { topicId: 'non-existent-topic', status: 'approved', isAdmin: true };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Topic not found.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
  });

  it('should return 405 for non-POST requests', async () => {
    mockReq.method = 'GET';
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
  });
});