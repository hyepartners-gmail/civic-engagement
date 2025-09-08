import { NextApiRequest, NextApiResponse } from 'next';
import handler from './upvote-solution';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { DUMMY_TOPICS } from '@/lib/dummy-data';
import { DUMMY_USERS } from '@/lib/dummy-users';
import { User, Topic } from '@/types';

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
    delete: jest.fn(),
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

// Mock badgeService functions
jest.mock('@/lib/badgeService', () => ({
  checkAndAwardBadges: jest.fn((user: User) => user), // Simply return the user for tests
  saveUserToDatastore: jest.fn(),
}));

// Mock dummy data modules
jest.mock('@/lib/dummy-data', () => ({
  DUMMY_TOPICS: [],
}));
jest.mock('@/lib/dummy-users', () => ({
  DUMMY_USERS: [],
}));

import { datastore as mockDatastore, fromDatastore as mockFromDatastore } from '@/lib/datastoreServer';
import { checkAndAwardBadges as mockCheckAndAwardBadges, saveUserToDatastore as mockSaveUserToDatastore } from '@/lib/badgeService';

describe('/api/upvote-solution', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let testUser: User;
  let testTopic: Topic;

  beforeEach(() => {
    // Define test data inside beforeEach to ensure a fresh state for each test
    testUser = {
      id: 'test-user-1',
      email: 'test@example.com',
      displayName: 'Test User',
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

    testTopic = {
      id: 'test-topic-1', // Keep as string, handle conversion in mockDatastore.get
      title: 'Test Topic',
      preview: 'Preview',
      region: 'national',
      problemStatement: 'Problem',
      status: 'approved',
      upvotes: 10,
      solutions: [
        { id: 'sol-a', title: 'Solution A', description: 'Desc A', status: 'approved', votes: 5 },
        { id: 'sol-b', title: 'Solution B', description: 'Desc B', status: 'approved', votes: 3 },
      ],
    };

    mockReq = { method: 'POST', body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    jest.clearAllMocks();

    // Default mock implementations
    mockDatastore.key.mockImplementation((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id } }));
    mockDatastore.get.mockImplementation((key: any) => {
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id; // Convert number ID to string for comparison
      if (key.kind === 'User' && requestedId === testUser.id) {
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testUser)), [Symbol('__key__')]: { id: testUser.id } }]);
      }
      if (key.kind === 'Topic' && requestedId === testTopic.id) {
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testTopic)), [Symbol('__key__')]: { id: testTopic.id } }]);
      }
      return Promise.resolve([null]);
    });
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
    mockSaveUserToDatastore.mockResolvedValue(undefined);
    mockDatastore.save.mockResolvedValue(undefined); // Ensure datastore.save also resolves
  });

  it('should successfully upvote a solution and update user/topic', async () => {
    mockReq.body = { solutionId: 'sol-a', userId: testUser.id, topicId: testTopic.id };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Vote recorded for topic ${testTopic.id}.`,
      newUpvotes: 6, // Original 5 + 1
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(2); // One for topic, one for user
    expect(mockCheckAndAwardBadges).toHaveBeenCalledWith(expect.objectContaining({
      votesCast: 1,
      totalSolutionVotes: 1,
      votedSolutions: [{ topicId: testTopic.id, solutionId: 'sol-a' }],
    }));
  });

  it('should successfully record a "no support" vote and update user', async () => {
    mockReq.body = { solutionId: null, userId: testUser.id, topicId: testTopic.id };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Vote recorded for topic ${testTopic.id}.`,
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1); // Only user save, topic is not modified
    expect(mockCheckAndAwardBadges).toHaveBeenCalledWith(expect.objectContaining({
      votesCast: 1,
      totalSolutionVotes: 0, // Not a solution vote
      votedSolutions: [{ topicId: testTopic.id, solutionId: null }],
    }));
  });

  it('should return 400 if userId or topicId is missing', async () => {
    mockReq.body = { solutionId: 'sol-a', userId: testUser.id }; // Missing topicId

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing userId or topicId.' });
  });

  it('should return 404 if user is not found', async () => {
    mockDatastore.get.mockImplementation((key: any) => {
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'User') return Promise.resolve([null]); // User not found
      if (key.kind === 'Topic' && requestedId === testTopic.id) return Promise.resolve([{ ...testTopic, [Symbol('__key__')]: { id: testTopic.id } }]);
      return Promise.resolve([null]);
    });
    mockReq.body = { solutionId: 'sol-a', userId: 'non-existent-user', topicId: testTopic.id };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found.' });
    expect(mockDatastore.save).not.toHaveBeenCalled(); // No save should occur
  });

  it('should return 404 if topic is not found', async () => {
    mockDatastore.get.mockImplementation((key: any) => {
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'User' && requestedId === testUser.id) return Promise.resolve([{ ...testUser, [Symbol('__key__')]: { id: testUser.id } }]);
      if (key.kind === 'Topic') return Promise.resolve([null]); // Topic not found
      return Promise.resolve([null]);
    });
    mockReq.body = { solutionId: 'sol-a', userId: testUser.id, topicId: 'non-existent-topic' };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Topic not found.' });
    expect(mockDatastore.save).not.toHaveBeenCalled(); // No save should occur
  });

  it('should return 403 if user is not verified', async () => {
    testUser.isVerified = false; // Set user as unverified
    mockDatastore.get.mockImplementation((key: any) => {
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'User' && requestedId === testUser.id) return Promise.resolve([{ ...testUser, [Symbol('__key__')]: { id: testUser.id } }]);
      if (key.kind === 'Topic' && requestedId === testTopic.id) return Promise.resolve([{ ...testTopic, [Symbol('__key__')]: { id: testTopic.id } }]);
      return Promise.resolve([null]);
    });
    mockReq.body = { solutionId: 'sol-a', userId: testUser.id, topicId: testTopic.id };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User must be verified to vote.' });
    expect(mockDatastore.save).not.toHaveBeenCalled(); // No save should occur
  });

  it('should return 409 if user has already voted on the topic', async () => {
    testUser.votedSolutions = [{ topicId: testTopic.id, solutionId: 'sol-a' }]; // User already voted
    mockDatastore.get.mockImplementation((key: any) => {
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'User' && requestedId === testUser.id) return Promise.resolve([{ ...testUser, [Symbol('__key__')]: { id: testUser.id } }]);
      if (key.kind === 'Topic' && requestedId === testTopic.id) return Promise.resolve([{ ...testTopic, [Symbol('__key__')]: { id: testTopic.id } }]);
      return Promise.resolve([null]);
    });
    mockReq.body = { solutionId: 'sol-b', userId: testUser.id, topicId: testTopic.id }; // Try to vote again

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User has already voted on this topic.' });
    expect(mockDatastore.save).not.toHaveBeenCalled(); // No save should occur
  });

  it('should return 404 if solution is not found within the topic', async () => {
    mockReq.body = { solutionId: 'non-existent-sol', userId: testUser.id, topicId: testTopic.id };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Solution not found within topic.' });
    expect(mockDatastore.save).not.toHaveBeenCalled(); // No save should occur
  });

  it('should return 405 for non-POST requests', async () => {
    mockReq.method = 'GET';

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.end).toHaveBeenCalledWith('Method GET Not Allowed');
  });
});