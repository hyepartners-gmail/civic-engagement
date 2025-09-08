import { NextApiRequest, NextApiResponse } from 'next';
import handler from './user-voted-topics';
import { datastore, fromDatastore } from '../../lib/datastoreServer';
import { DUMMY_TOPICS } from '../../lib/dummy-data';
import { DUMMY_USERS } from '../../lib/dummy-users';
import { User, Topic } from '../../types';

// Mock the Datastore client and its methods
jest.mock('../../lib/datastoreServer', () => {
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

const mockDatastore = require('../../lib/datastoreServer').datastore;
const mockFromDatastore = require('../../lib/datastoreServer').fromDatastore;

describe('/api/user-voted-topics', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let testUser: User;
  let testTopics: Topic[];

  // Define a persistent mock for the query object
  let mockQueryObject: any;

  beforeEach(() => {
    testUser = {
      id: 'user-1',
      email: 'user1@example.com',
      displayName: 'User One',
      isVerified: true,
      votesCast: 2,
      totalComments: 0,
      totalSolutionVotes: 0,
      approvedSuggestions: 0,
      totalUpvotes: 0,
      badges: [],
      badgeProgress: [],
      votedSolutions: [
        { topicId: 'topic-1', solutionId: 'sol-1-1' },
        { topicId: 'topic-3', solutionId: null }, // Skipped solution voting
      ],
      isMuted: false,
      lastActivityDate: new Date().toISOString(),
      currentStreak: 0,
    };

    testTopics = [
      {
        id: "topic-1",
        title: "Federal Personal Income Tax Rate",
        preview: "What should the federal income tax rates be for high earners?",
        region: "national",
        problemStatement: "The current federal personal income tax structure is often debated. What income limits should define higher tax brackets, and what should those rates be? For example, should those earning over $400k/year face higher taxes? What about rates like 30% for incomes over $250k, and 40% for incomes over $500k?",
        status: "approved",
        upvotes: 520,
        solutions: [
          { id: "sol-1-1", title: "Progressive Tax Increase", description: "Increase top marginal tax rates for incomes above $250k to 35% and above $500k to 45%.", status: "approved", votes: 150 },
          { id: "sol-1-2", title: "Flat Tax System", description: "Implement a flat tax rate of 20% for all income levels, simplifying the tax code.", status: "approved", votes: 80 },
        ],
      },
      {
        id: "topic-2",
        title: "Corporate Tax Rate",
        preview: "What is the ideal corporate tax rate for the U.S. economy?",
        region: "national",
        problemStatement: "The corporate tax rate has significant impacts on the economy, corporate behavior, and government revenue. What corporate tax rate do you propose, and what is the reasoning behind your proposal?",
        status: "approved",
        upvotes: 480,
        solutions: [
          { id: "sol-2-1", title: "Lower to 15% for Competitiveness", description: "Reduce corporate tax to 15% to attract businesses and stimulate economic growth.", status: "approved", votes: 120 },
          { id: "sol-2-2", title: "Increase to 28% for Public Services", description: "Raise corporate tax to 28% to fund infrastructure and social programs.", status: "approved", votes: 180 },
        ],
      },
      {
        id: "topic-3",
        title: "The Carried Interest Loophole",
        preview: "Should the tax break for carried interest be eliminated?",
        region: "national",
        problemStatement: "The 'carried interest loophole' allows investment managers to treat their earnings as capital gains, which are taxed at a lower rate than ordinary income. Would you do away with this tax break? Why or why not?",
        status: "approved",
        upvotes: 610,
        solutions: [],
      },
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
    
    // Mock datastore.get to return the testUser when queried
    mockDatastore.get.mockImplementation((key: any) => {
      if (key.kind === 'User' && key.id === testUser.id) {
        // Return a deep copy to prevent modification by the handler affecting other tests
        return Promise.resolve([{ ...JSON.parse(JSON.stringify(testUser)), [Symbol('__key__')]: { id: testUser.id } }]);
      }
      return Promise.resolve([null]);
    });
    
    mockFromDatastore.mockImplementation((entity: any) => ({
      ...entity,
      id: entity[Symbol('__key__')]?.id || entity[Symbol('__key__')]?.name,
    }));
  });

  it('should return user voted topics with alignment information', async () => {
    mockQueryObject.runQuery.mockResolvedValueOnce([
      testTopics.map(t => ({ ...t, [Symbol('__key__')]: { id: t.id } })),
    ]);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        id: 'topic-1',
        title: 'Federal Personal Income Tax Rate',
        userAlignment: 'Aligned with Leading Solution',
        userVotedSolutionId: 'sol-1-1',
      }),
      expect.objectContaining({
        id: 'topic-3',
        title: 'The Carried Interest Loophole',
        userAlignment: 'Skipped Solution Voting',
        userVotedSolutionId: null,
      }),
    ]));
    expect(mockRes.json).toHaveProperty('mock.calls[0][0].length', 2); // Expecting 2 topics
  });

  it('should fall back to dummy data if Datastore user fetch fails', async () => {
    mockDatastore.get.mockResolvedValueOnce([null]); // Simulate user not found in Datastore
    mockQueryObject.runQuery.mockResolvedValueOnce([[]]); // Simulate no topics in Datastore

    // Temporarily modify DUMMY_USERS and DUMMY_TOPICS for this test
    const originalDummyUsers = [...DUMMY_USERS];
    const originalDummyTopics = [...DUMMY_TOPICS];
    DUMMY_USERS.length = 0;
    DUMMY_TOPICS.length = 0;
    DUMMY_USERS.push(testUser);
    DUMMY_TOPICS.push(...testTopics);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'topic-1' }),
      expect.objectContaining({ id: 'topic-3' }),
    ]));

    DUMMY_USERS.length = 0; DUMMY_USERS.push(...originalDummyUsers);
    DUMMY_TOPICS.length = 0; DUMMY_TOPICS.push(...originalDummyTopics);
  });

  it('should return 404 if user not found even in dummy data', async () => {
    mockDatastore.get.mockResolvedValueOnce([null]); // Simulate user not found in Datastore
    mockQueryObject.runQuery.mockResolvedValueOnce([[]]); // Simulate no topics in Datastore

    const originalDummyUsers = [...DUMMY_USERS];
    DUMMY_USERS.length = 0; // Ensure dummy users is empty

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found (Datastore error fallback).' });

    DUMMY_USERS.length = 0; DUMMY_USERS.push(...originalDummyUsers);
  });

  it('should return 405 for non-GET requests', async () => {
    mockReq.method = 'POST';

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.end).toHaveBeenCalledWith('Method POST Not Allowed');
  });
});