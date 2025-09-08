import { NextApiRequest, NextApiResponse } from 'next';
import handler from './user-actions';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { DUMMY_USERS } from '@/lib/dummy-users';
import { DUMMY_COMMENTS } from '@/lib/dummy-data';
import { User, Comment } from '@/types';

// Mock Datastore
jest.mock('@/lib/datastoreServer', () => {
  const mockFilter = jest.fn().mockReturnThis();
  const mockRunQuery = jest.fn();
  const mockGet = jest.fn();
  const mockSave = jest.fn();

  const mockDatastoreInstance = {
    key: jest.fn((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id } })),
    save: mockSave,
    get: mockGet,
    delete: jest.fn(),
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

// Mock badgeService functions
jest.mock('@/lib/badgeService', () => ({
  checkAndAwardBadges: jest.fn((user: User) => user), // Simply return the user for tests
  saveUserToDatastore: jest.fn(),
}));

// Mock dummy data modules
jest.mock('@/lib/dummy-data', () => ({
  DUMMY_COMMENTS: [],
  DUMMY_TOPICS: [],
}));
jest.mock('@/lib/dummy-users', () => ({
  DUMMY_USERS: [],
}));

// Mock send-email API call
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'Email sent' }),
  })
) as jest.Mock;

import { datastore as mockDatastore, fromDatastore as mockFromDatastore } from '@/lib/datastoreServer';
import { checkAndAwardBadges as mockCheckAndAwardBadges, saveUserToDatastore as mockSaveUserToDatastore } from '@/lib/badgeService';

describe('/api/user-actions', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let testUser: User;

  beforeEach(() => {
    // Define test data inside beforeEach to ensure a fresh state for each test
    testUser = {
      id: 'test-user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      isVerified: true, // Default to verified for most tests
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
    DUMMY_COMMENTS.length = 0; // Clear dummy comments for clean tests

    // Reset all mocks for each test
    mockDatastore.key.mockClear();
    mockDatastore.save.mockClear();
    mockDatastore.get.mockClear();
    mockFromDatastore.mockClear();
    mockCheckAndAwardBadges.mockClear();
    mockSaveUserToDatastore.mockClear();
    (global.fetch as jest.Mock).mockClear();

    mockDatastore.key.mockImplementation((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id: id || 'generated-id' } }));
    
    // Mock datastore.get to return the testUser when queried
    mockDatastore.get.mockImplementation((key: any) => {
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'User' && requestedId === testUser.id) {
        // Return a deep copy to prevent modification by the handler affecting other tests
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testUser)), [Symbol('__key__')]: { id: testUser.id } }]);
      }
      return Promise.resolve([null]);
    });
    
    mockDatastore.save.mockResolvedValue(undefined); // Default successful save
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
    mockSaveUserToDatastore.mockResolvedValue(undefined);
  });

  it('should return 400 if userId is missing', async () => {
    mockReq.body = { actionType: 'comment', payload: { commentText: 'Hello' } }; // Missing userId

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing userId.' });
  });

  it('should return 404 if user is not found', async () => {
    mockDatastore.get.mockImplementationOnce(() => Promise.resolve([null])); // User not found for this specific test
    mockReq.body = { actionType: 'comment', userId: 'non-existent-user', payload: { commentText: 'Hello' } };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User non-existent-user not found.' });
  });

  it('should return 403 if unverified user tries to comment', async () => {
    testUser.isVerified = false; // Set user as unverified for this test
    mockDatastore.get.mockImplementationOnce((key: any) => { // Mock get for this specific test
      const requestedId = typeof key.id === 'number' ? key.id.toString() : key.id;
      if (key.kind === 'User' && requestedId === testUser.id) {
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testUser)), [Symbol('__key__')]: { id: testUser.id } }]);
      }
      return Promise.resolve([null]);
    });
    mockReq.body = { actionType: 'comment', userId: testUser.id, payload: { commentText: 'Hello' } };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User must be verified to perform this action.' });
    expect(mockDatastore.save).not.toHaveBeenCalled();
  });

  it('should successfully post a comment for a verified user', async () => {
    mockReq.body = { actionType: 'comment', userId: testUser.id, payload: { commentText: 'My new comment' } };
    mockDatastore.save.mockResolvedValueOnce([{ key: { id: 'new-comment-id' } }]); // Mock comment save

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: `Action 'comment' processed.`,
      user: expect.objectContaining({ totalComments: 1 }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(2); // One for comment, one for user
    expect(mockDatastore.save).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ text: 'My new comment', status: 'pending' }),
    }));
    expect(DUMMY_COMMENTS).toHaveLength(1);
    expect(DUMMY_COMMENTS[0].text).toBe('My new comment');
  });

  it('should increment votesCast and record votedSolutions for skip_topic action', async () => {
    mockReq.body = { actionType: 'skip_topic', userId: testUser.id, payload: { topicId: 'topic-123' } };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({
        votesCast: 1,
        votedSolutions: [{ topicId: 'topic-123', solutionId: null }],
      }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1); // Only user save
  });

  it('should increment approvedSuggestions for suggest_topic_approved action', async () => {
    mockReq.body = { actionType: 'suggest_topic_approved', userId: testUser.id, payload: {} };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ approvedSuggestions: 1 }),
    }));
    expect(mockDatastore.save).toHaveBeenCalledTimes(1); // Only user save
  });

  it('should update streak and lastActivityDate', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    testUser.lastActivityDate = yesterday.toISOString();
    testUser.currentStreak = 5;

    mockReq.body = { actionType: 'comment', userId: testUser.id, payload: { commentText: 'Streak comment' } };
    mockDatastore.save.mockResolvedValueOnce([{ key: { id: 'new-comment-id' } }]); // Mock comment save

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({
        currentStreak: 6, // 5 + 1
        lastActivityDate: expect.any(String), // Should be updated to today
      }),
    }));
  });

  it('should reset streak if activity is not consecutive', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    testUser.lastActivityDate = twoDaysAgo.toISOString();
    testUser.currentStreak = 5;

    mockReq.body = { actionType: 'comment', userId: testUser.id, payload: { commentText: 'Broken streak comment' } };
    mockDatastore.save.mockResolvedValueOnce([{ key: { id: 'new-comment-id' } }]); // Mock comment save

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({
        currentStreak: 1, // Reset to 1
        lastActivityDate: expect.any(String),
      }),
    }));
  });

  it('should send email for streak milestones (e.g., 7 days)', async () => {
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    testUser.lastActivityDate = sixDaysAgo.toISOString();
    testUser.currentStreak = 6; // Will become 7 after this action

    mockReq.body = { actionType: 'comment', userId: testUser.id, payload: { commentText: '7-day streak!' } };
    mockDatastore.save.mockResolvedValueOnce([{ key: { id: 'new-comment-id' } }]); // Mock comment save

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(global.fetch).toHaveBeenCalledWith('/api/send-email', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ // Ensure body is stringified
        to: testUser.email,
        subject: `🎉 Your Civic Engagement Streak!`,
        body: expect.stringContaining('7-day daily streak'),
      }),
    }));
  });

  it('should return 405 for non-POST requests', async () => {
    mockReq.method = 'GET';

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.end).toHaveBeenCalledWith('Method GET Not Allowed');
  });
});