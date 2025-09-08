import { FakeDatastore } from './fakeDatastore';
import { Message, ABPair, VoteAggregateShard } from '@/lib/messaging-schemas';

export interface TestFixtures {
  datastore: FakeDatastore;
  messages: {
    M1: Message;
    M2: Message;
    M3: Message;
    M4: Message;
  };
  abPairs: {
    AB1: ABPair;
  };
}

/**
 * Creates test fixtures with seeded data according to test specification:
 * - Messages: M1,M2,M3 active with ranks 'a'<'m'<'z'; M4 inactive
 * - AB pairs: (M1,M2) active
 * - Shards: empty by default
 */
export async function createTestFixtures(
  config: { enableEventualConsistency?: boolean; rollupDelay?: number } = {}
): Promise<TestFixtures> {
  const datastore = new FakeDatastore(config);

  // Create test messages
  const now = new Date();
  
  const M1: Message = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    slogan: 'Test Message 1',
    subline: 'First test message',
    status: 'active',
    rank: 'a',
    createdAt: now,
    updatedAt: now,
  };

  const M2: Message = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    slogan: 'Test Message 2',
    subline: 'Second test message',
    status: 'active',
    rank: 'm',
    createdAt: now,
    updatedAt: now,
  };

  const M3: Message = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    slogan: 'Test Message 3',
    subline: 'Third test message',
    status: 'active',
    rank: 'z',
    createdAt: now,
    updatedAt: now,
  };

  const M4: Message = {
    id: '550e8400-e29b-41d4-a716-446655440004',
    slogan: 'Test Message 4 (Inactive)',
    subline: 'Fourth test message - inactive',
    status: 'inactive',
    rank: 'zz',
    createdAt: now,
    updatedAt: now,
  };

  // Create AB pair
  const AB1: ABPair = {
    id: '550e8400-e29b-41d4-a716-446655440101',
    a: M1.id,
    b: M2.id,
    status: 'active',
    rank: 'p',
    createdAt: now,
    updatedAt: now,
  };

  // Save messages to datastore
  await datastore.save([
    { key: datastore.key(['Message', M1.id]), data: M1 },
    { key: datastore.key(['Message', M2.id]), data: M2 },
    { key: datastore.key(['Message', M3.id]), data: M3 },
    { key: datastore.key(['Message', M4.id]), data: M4 },
  ]);

  // Save AB pair to datastore
  await datastore.save({
    key: datastore.key(['ABPair', AB1.id]),
    data: AB1,
  });

  return {
    datastore,
    messages: { M1, M2, M3, M4 },
    abPairs: { AB1 },
  };
}

/**
 * Creates sample vote aggregate shards for testing
 */
export async function createTestShards(
  datastore: FakeDatastore,
  messageId: string,
  options: {
    love?: number;
    like?: number;
    dislike?: number;
    hate?: number;
    geoBucket?: string;
    partyBucket?: string;
    demoBucket?: string;
    day?: string;
  } = {}
): Promise<VoteAggregateShard> {
  const {
    love = 0,
    like = 0,
    dislike = 0,
    hate = 0,
    geoBucket = undefined,
    partyBucket = undefined,
    demoBucket = undefined,
    day = '2024-01-15',
  } = options;

  const shardId = Math.random().toString(36).substring(7);
  const compositeKey = [
    messageId.substring(0, 8),
    geoBucket || 'ALL',
    partyBucket || 'ALL',
    demoBucket || 'ALL',
    day,
  ].join('_');

  const shard: VoteAggregateShard = {
    id: `${compositeKey}:${shardId}`,
    messageId,
    geoBucket,
    partyBucket: partyBucket as any,
    demoBucket,
    day,
    counts: { love, like, dislike, hate },
    updatedAt: new Date(),
    compositeKey,
  };

  await datastore.save({
    key: datastore.key(['VoteAggregateShard', shard.id]),
    data: shard,
  });

  return shard;
}

/**
 * Helper to create multiple test users for testing
 */
export const TEST_USERS = {
  admin: {
    id: 'admin-user-123',
    email: 'admin@test.com',
    role: 'admin',
  },
  regular: {
    id: 'regular-user-456',
    email: 'user@test.com',
    role: 'user',
  },
  anonymous: {
    sessionId: 'anon-session-789',
  },
};

/**
 * Helper to create test user contexts for vote processing
 */
export const TEST_USER_CONTEXTS = {
  democrat_california_youth: {
    geoBucket: 'US_CA',
    partyBucket: 'D' as const,
    demoBucket: 'age_18_24',
  },
  republican_texas_senior: {
    geoBucket: 'US_TX',
    partyBucket: 'R' as const,
    demoBucket: 'age_65_plus',
  },
  independent_florida_middle: {
    geoBucket: 'US_FL',
    partyBucket: 'I' as const,
    demoBucket: 'age_35_44',
  },
  minimal: {},
};

/**
 * Helper to reset datastore to initial state
 */
export async function resetFixtures(fixtures: TestFixtures): Promise<void> {
  fixtures.datastore.clear();
  
  // Re-seed with initial data
  const { messages, abPairs } = fixtures;
  
  await fixtures.datastore.save([
    { key: fixtures.datastore.key(['Message', messages.M1.id]), data: messages.M1 },
    { key: fixtures.datastore.key(['Message', messages.M2.id]), data: messages.M2 },
    { key: fixtures.datastore.key(['Message', messages.M3.id]), data: messages.M3 },
    { key: fixtures.datastore.key(['Message', messages.M4.id]), data: messages.M4 },
  ]);

  await fixtures.datastore.save({
    key: fixtures.datastore.key(['ABPair', abPairs.AB1.id]),
    data: abPairs.AB1,
  });
}

/**
 * Utility to wait for eventual consistency delays in tests
 */
export function waitForEventualConsistency(delay = 10): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Mock session for testing authenticated routes
 */
export function createMockSession(user: typeof TEST_USERS.admin | typeof TEST_USERS.regular) {
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Mock NextApiRequest with common test data
 */
export function createMockRequest(overrides: any = {}) {
  return {
    method: 'GET',
    url: '/api/test',
    headers: {},
    cookies: {},
    query: {},
    body: {},
    socket: {
      remoteAddress: '127.0.0.1',
    },
    connection: {
      remoteAddress: '127.0.0.1',
    },
    ...overrides,
  };
}

/**
 * Mock NextApiResponse for testing
 */
export function createMockResponse() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    statusCode: 200,
  };
  
  return response;
}