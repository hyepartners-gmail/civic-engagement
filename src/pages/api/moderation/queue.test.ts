import { NextApiRequest, NextApiResponse } from 'next';
import handler from './queue';
import { datastore, fromDatastore } from '@/lib/datastoreServer';
import { Comment, Topic, User } from '@/types';
import { DUMMY_COMMENTS, DUMMY_TOPICS } from '@/lib/dummy-data';
import { DUMMY_USERS } from '@/lib/dummy-users';

// Mock Datastore
jest.mock('@/lib/datastoreServer', () => {
  const mockFilter = jest.fn().mockReturnThis();
  const mockRunQuery = jest.fn();
  const mockGet = jest.fn();

  const mockDatastoreInstance = {
    // createQuery will be mocked to return a new object each time
    createQuery: jest.fn(), 
    key: jest.fn((kind: string, id?: string) => ({ kind, id, [Symbol('__key__')]: { id } })),
    save: jest.fn(),
    get: mockGet,
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

// Mock dummy data modules
jest.mock('@/lib/dummy-data', () => ({
  DUMMY_COMMENTS: [],
  DUMMY_TOPICS: [],
}));
jest.mock('@/lib/dummy-users', () => ({
  DUMMY_USERS: [],
}));

import { datastore as mockDatastore, fromDatastore as mockFromDatastore } from '@/lib/datastoreServer';

describe('/api/moderation/queue', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let datastoreFlaggedComments: Comment[];
  let datastoreFlaggedTopics: Topic[];
  let datastoreMutedUsers: User[];

  beforeEach(() => {
    datastoreFlaggedComments = [
      { id: 'fc-1', text: 'Flagged comment 1', author: { id: 'u1', displayName: 'User1', badges: [] }, timestamp: '', parentId: null, flags: 5, status: 'pending' },
      { id: 'fc-2', text: 'Flagged comment 2', author: { id: 'u2', displayName: 'User2', badges: [] }, timestamp: '', parentId: null, flags: 2, status: 'pending' },
    ];
    datastoreFlaggedTopics = [
      { id: 'ft-1', title: 'Flagged Topic 1', preview: '', region: 'national', problemStatement: '', status: 'approved', upvotes: 10, flags: 3 },
    ];
    datastoreMutedUsers = [
      { id: 'mu-1', email: 'm1@e.com', displayName: 'Muted User 1', isVerified: true, votesCast: 0, totalComments: 0, totalSolutionVotes: 0, approvedSuggestions: 0, totalUpvotes: 0, votedSolutions: [], isMuted: true, lastActivityDate: '', currentStreak: 0 },
    ];

    mockReq = { method: 'GET', query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    jest.clearAllMocks();

    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));

    // Mock createQuery to return a new mock object for each call
    mockDatastore.createQuery.mockImplementation((kind: string) => {
      const queryMock: any = {
        filter: jest.fn().mockReturnThis(),
        runQuery: jest.fn(),
      };
      return queryMock;
    });
  });

  it('should return 403 if not admin', async () => {
    mockReq.query = { isAdmin: 'false' };
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: Admin access required.' });
    expect(mockDatastore.createQuery).not.toHaveBeenCalled();
  });

  it('should return flagged comments, topics, and muted users if admin', async () => {
    mockReq.query = { isAdmin: 'true' };

    // Set up mocks for each createQuery call in sequence
    // First call for Comments
    mockDatastore.createQuery.mockReturnValueOnce({
      filter: jest.fn().mockReturnThis(),
      runQuery: jest.fn().mockResolvedValueOnce([datastoreFlaggedComments.map(c => ({ ...c, [Symbol('__key__')]: { id: c.id } }))]),
    });
    // Second call for Topics
    mockDatastore.createQuery.mockReturnValueOnce({
      filter: jest.fn().mockReturnThis(),
      runQuery: jest.fn().mockResolvedValueOnce([datastoreFlaggedTopics.map(t => ({ ...t, [Symbol('__key__')]: { id: t.id } }))]),
    });
    // Third call for Users
    mockDatastore.createQuery.mockReturnValueOnce({
      filter: jest.fn().mockReturnThis(),
      runQuery: jest.fn().mockResolvedValueOnce([datastoreMutedUsers.map(u => ({ ...u, [Symbol('__key__')]: { id: u.id } }))]),
    });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      flaggedComments: [
        expect.objectContaining({ id: 'fc-1', flags: 5 }),
        expect.objectContaining({ id: 'fc-2', flags: 2 }),
      ],
      flaggedTopics: [
        expect.objectContaining({ id: 'ft-1', flags: 3 }),
      ],
      flaggedUsers: [
        expect.objectContaining({ user: expect.objectContaining({ id: 'mu-1', isMuted: true }) }),
      ],
    }));
    expect(mockDatastore.createQuery).toHaveBeenCalledWith('Comment');
    expect(mockDatastore.createQuery).toHaveBeenCalledWith('Topic');
    expect(mockDatastore.createQuery).toHaveBeenCalledWith('User');
  });

  it('should fall back to dummy data on Datastore error', async () => {
    mockReq.query = { isAdmin: 'true' };
    // Make all createQuery calls reject
    mockDatastore.createQuery.mockImplementation(() => {
      const queryMock: any = {
        filter: jest.fn().mockReturnThis(),
        runQuery: jest.fn().mockRejectedValue(new Error('Datastore error')),
      };
      return queryMock;
    });

    // Temporarily modify dummy data for this test
    const originalDummyComments = [...DUMMY_COMMENTS];
    const originalDummyTopics = [...DUMMY_TOPICS];
    const originalDummyUsers = [...DUMMY_USERS];
    DUMMY_COMMENTS.length = 0;
    DUMMY_TOPICS.length = 0;
    DUMMY_USERS.length = 0;
    DUMMY_COMMENTS.push({ id: 'dc-1', text: 'Dummy Flagged Comment', author: { id: 'u1', displayName: 'DUser1', badges: [] }, timestamp: '', parentId: null, flags: 1, status: 'pending' });
    DUMMY_TOPICS.push({ id: 'dt-1', title: 'Dummy Flagged Topic', preview: '', region: 'national', problemStatement: '', status: 'approved', upvotes: 0, flags: 1 });
    DUMMY_USERS.push({ id: 'du-1', email: 'du1@e.com', displayName: 'Dummy Muted User', isVerified: true, votesCast: 0, totalComments: 0, totalSolutionVotes: 0, approvedSuggestions: 0, totalUpvotes: 0, votedSolutions: [], isMuted: true, lastActivityDate: '', currentStreak: 0 });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Failed to fetch moderation queue data.',
      flaggedComments: [expect.objectContaining({ id: 'dc-1' })],
      flaggedTopics: [expect.objectContaining({ id: 'dt-1' })],
      flaggedUsers: [expect.objectContaining({ user: expect.objectContaining({ id: 'du-1' }) })],
    }));

    // Restore original dummy data
    DUMMY_COMMENTS.length = 0; DUMMY_COMMENTS.push(...originalDummyComments);
    DUMMY_TOPICS.length = 0; DUMMY_TOPICS.push(...originalDummyTopics);
    DUMMY_USERS.length = 0; DUMMY_USERS.push(...originalDummyUsers);
  });

  it('should return 405 for non-GET requests', async () => {
    mockReq.method = 'POST';
    mockReq.query = { isAdmin: 'true' };
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
  });
});