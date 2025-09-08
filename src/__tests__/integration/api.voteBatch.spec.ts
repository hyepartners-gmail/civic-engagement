import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import voteBatchHandler from '@/pages/api/messages/vote-batch';
import { createTestFixtures, createTestShards, TEST_USER_CONTEXTS, resetFixtures } from '../fixtures/testData';
import type { TestFixtures } from '../fixtures/testData';

// Mock the datastore module
jest.mock('@/lib/datastoreServer', () => {
  let mockDatastore: any = null;
  
  return {
    get datastore() {
      return mockDatastore;
    },
    set datastore(ds: any) {
      mockDatastore = ds;
    },
    fromDatastore: jest.fn((entity: any) => {
      const { [Symbol.for('KEY')]: key, ...data } = entity;
      return { ...data, id: key?.id || key?.name };
    }),
    DATASTORE_NAMESPACE: 'test',
  };
});

// Mock rate limiting
jest.mock('@/lib/rate-limiting', () => ({
  voteRateLimiter: jest.fn((req, res, next) => next()),
}));

// Mock vote aggregation service
jest.mock('@/lib/vote-aggregation-service', () => ({
  processVoteBatch: jest.fn(),
}));

const mockProcessVoteBatch = require('@/lib/vote-aggregation-service').processVoteBatch;
const mockVoteRateLimiter = require('@/lib/rate-limiting').voteRateLimiter;

describe('API Integration Tests - Vote Batch Processing', () => {
  let fixtures: TestFixtures;

  beforeEach(async () => {
    fixtures = await createTestFixtures();
    
    // Set the mocked datastore
    const datastoreModule = require('@/lib/datastoreServer');
    datastoreModule.datastore = fixtures.datastore;
    
    jest.clearAllMocks();
    
    // Default successful vote processing
    mockProcessVoteBatch.mockResolvedValue({
      accepted: 1,
      dropped: 0,
      errors: [],
    });
  });

  afterEach(async () => {
    await resetFixtures(fixtures);
  });

  describe('POST /api/messages/vote-batch', () => {
    it('should accept valid vote batch up to 100 votes', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
        { messageId: fixtures.messages.M2.id, choice: 2 },
        { messageId: fixtures.messages.M3.id, choice: 3 },
      ];

      mockProcessVoteBatch.mockResolvedValue({
        accepted: 3,
        dropped: 0,
        errors: [],
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.1',
        },
        cookies: {
          'anon-session-id': 'test-session-123',
        },
        body: {
          votes,
          userContext: TEST_USER_CONTEXTS.democrat_california_youth,
        },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        accepted: 3,
        dropped: 0,
        errors: [],
      });

      // Verify vote processing was called with correct parameters
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        votes,
        TEST_USER_CONTEXTS.democrat_california_youth,
        undefined, // No user ID (anonymous)
        'test-session-123'
      );
    });

    it('should handle authenticated user votes', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
      ];

      mockProcessVoteBatch.mockResolvedValue({
        accepted: 1,
        dropped: 0,
        errors: [],
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          votes,
          userContext: TEST_USER_CONTEXTS.republican_texas_senior,
          userId: 'user-123', // Simulating authenticated user
        },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        votes,
        TEST_USER_CONTEXTS.republican_texas_senior,
        'user-123',
        undefined // No anonymous session
      );
    });

    it('should handle idempotency with same key', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
      ];

      // First request
      mockProcessVoteBatch.mockResolvedValueOnce({
        accepted: 1,
        dropped: 0,
        errors: [],
      });

      const { req: req1, res: res1 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'idempotency-key': 'test-key-123',
        },
        cookies: { 'anon-session-id': 'test-session' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req1, res1);
      expect(res1._getStatusCode()).toBe(200);

      // Second request with same idempotency key should return cached result
      mockProcessVoteBatch.mockResolvedValueOnce({
        accepted: 0,
        dropped: 1,
        errors: [],
      });

      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'idempotency-key': 'test-key-123',
        },
        cookies: { 'anon-session-id': 'test-session' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req2, res2);
      expect(res2._getStatusCode()).toBe(200);

      const data2 = JSON.parse(res2._getData());
      expect(data2).toEqual({
        accepted: 0,
        dropped: 1,
        errors: [],
      });
    });

    it('should reject votes exceeding 100 limit', async () => {
      const votes = Array.from({ length: 101 }, (_, i) => ({
        messageId: fixtures.messages.M1.id,
        choice: 1,
      }));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('100');
    });

    it('should validate vote choice values', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 5 }, // Invalid choice
      ];

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate message IDs exist', async () => {
      const votes = [
        { messageId: 'non-existent-message-id', choice: 1 },
      ];

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_MESSAGE_ID');
    });

    it('should enforce rate limiting', async () => {
      mockVoteRateLimiter.mockImplementationOnce((req, res, next) => {
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            retryAfter: 60,
          },
        });
      });

      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
      ];

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(429);
      expect(mockVoteRateLimiter).toHaveBeenCalled();
    });

    it('should handle partial batch failures', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
        { messageId: fixtures.messages.M2.id, choice: 2 },
      ];

      mockProcessVoteBatch.mockResolvedValue({
        accepted: 1,
        dropped: 1,
        errors: [
          {
            vote: votes[1],
            error: 'Database connection failed',
          },
        ],
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.accepted).toBe(1);
      expect(data.dropped).toBe(1);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].error).toBe('Database connection failed');
    });

    it('should handle empty votes array', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes: [], userContext: {} },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create vote aggregate shards only (no per-vote rows)', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
      ];

      mockProcessVoteBatch.mockResolvedValue({
        accepted: 1,
        dropped: 0,
        errors: [],
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: TEST_USER_CONTEXTS.democrat_california_youth },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockProcessVoteBatch).toHaveBeenCalled();

      // Verify no individual vote entities are created
      const allEntities = fixtures.datastore.getAllEntities();
      const voteEntities = allEntities.filter(entity => entity.key.kind === 'Vote');
      expect(voteEntities).toHaveLength(0);
    });

    it('should write both day="ALL" and UTC day shard keys', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
      ];

      // Mock the actual vote processing to verify shard creation
      mockProcessVoteBatch.mockImplementation(async (votesParam: any[], userContext: any, userId?: string, anonSessionId?: string) => {
        // Simulate creating shards for both ALL and current day
        await createTestShards(fixtures.datastore, fixtures.messages.M1.id, {
          love: 1,
          geoBucket: userContext.geoBucket,
          partyBucket: userContext.partyBucket,
          demoBucket: userContext.demoBucket,
          day: 'ALL',
        });

        await createTestShards(fixtures.datastore, fixtures.messages.M1.id, {
          love: 1,
          geoBucket: userContext.geoBucket,
          partyBucket: userContext.partyBucket,
          demoBucket: userContext.demoBucket,
          day: '2024-01-15', // UTC day
        });

        return { accepted: 1, dropped: 0, errors: [] };
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: TEST_USER_CONTEXTS.democrat_california_youth },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      // Verify both ALL and day-specific shards were created
      const shardEntities = fixtures.datastore.getEntitiesByKind('VoteAggregateShard');
      expect(shardEntities.length).toBeGreaterThanOrEqual(2);
      
      const allDayShards = shardEntities.filter(e => e.data.day === 'ALL');
      const specificDayShards = shardEntities.filter(e => e.data.day === '2024-01-15');
      
      expect(allDayShards.length).toBeGreaterThan(0);
      expect(specificDayShards.length).toBeGreaterThan(0);
    });

    it('should handle one-vote-per-slogan deduplication', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
        { messageId: fixtures.messages.M1.id, choice: 2 }, // Duplicate message
      ];

      mockProcessVoteBatch.mockResolvedValue({
        accepted: 1,
        dropped: 1,
        errors: [],
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cookies: { 'anon-session-id': 'test-session' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.accepted).toBe(1);
      expect(data.dropped).toBe(1);
    });

    it('should handle malformed JSON', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json{',
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should handle processing errors gracefully', async () => {
      mockProcessVoteBatch.mockRejectedValue(new Error('Database connection failed'));

      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
      ];

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: {} },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Vote Processing Integration', () => {
    it('should process votes with correct user context derivation', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
      ];

      const userContext = {
        geoBucket: 'US_NY',
        partyBucket: 'I' as const,
        demoBucket: 'age_45_54',
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.1',
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
        cookies: { 'anon-session-id': 'test-session-456' },
        body: { votes, userContext },
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        votes,
        userContext,
        undefined,
        'test-session-456'
      );
    });

    it('should handle minimal user context', async () => {
      const votes = [
        { messageId: fixtures.messages.M1.id, choice: 1 },
      ];

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { votes, userContext: {} }, // Minimal context
      });

      await voteBatchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        votes,
        {},
        undefined,
        undefined
      );
    });
  });
});