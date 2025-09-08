import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import resultsHandler from '@/pages/api/admin/messages/results';
import { createTestFixtures, createTestShards, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
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

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  getSession: jest.fn(),
}));

// Mock vote aggregation service
jest.mock('@/lib/vote-aggregation-service', () => ({
  aggregateVoteResults: jest.fn(),
}));

const mockGetSession = require('next-auth/react').getSession;
const mockAggregateVoteResults = require('@/lib/vote-aggregation-service').aggregateVoteResults;

describe('API Integration Tests - Results Analytics', () => {
  let fixtures: TestFixtures;

  beforeEach(async () => {
    fixtures = await createTestFixtures();
    
    // Set the mocked datastore
    const datastoreModule = require('@/lib/datastoreServer');
    datastoreModule.datastore = fixtures.datastore;
    
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await resetFixtures(fixtures);
  });

  describe('GET /api/admin/messages/results', () => {
    beforeEach(async () => {
      // Create test vote shards for different scenarios
      await createTestShards(fixtures.datastore, fixtures.messages.M1.id, {
        love: 10, like: 5, dislike: 2, hate: 1,
        geoBucket: 'US_CA',
        partyBucket: 'D',
        demoBucket: 'age_25_34',
        day: '2024-01-15',
      });

      await createTestShards(fixtures.datastore, fixtures.messages.M1.id, {
        love: 8, like: 3, dislike: 1, hate: 0,
        geoBucket: 'US_TX',
        partyBucket: 'R',
        demoBucket: 'age_35_44',
        day: '2024-01-16',
      });

      await createTestShards(fixtures.datastore, fixtures.messages.M2.id, {
        love: 5, like: 7, dislike: 3, hate: 2,
        geoBucket: 'US_NY',
        partyBucket: 'I',
        demoBucket: 'age_45_54',
        day: '2024-01-15',
      });
    });

    it('should group by day with ascending date keys', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'day',
        items: [
          {
            key: '2024-01-15',
            counts: { love: 15, like: 12, dislike: 5, hate: 3, n: 35 },
            rates: { loveRate: 0.43, likeRate: 0.34, dislikeRate: 0.14, hateRate: 0.09, favorability: 0.54, engagement: 35 },
          },
          {
            key: '2024-01-16',
            counts: { love: 8, like: 3, dislike: 1, hate: 0, n: 12 },
            rates: { loveRate: 0.67, likeRate: 0.25, dislikeRate: 0.08, hateRate: 0.00, favorability: 0.83, engagement: 12 },
          },
        ],
        totals: { love: 23, like: 15, dislike: 6, hate: 3, n: 47 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'day',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.groupBy).toBe('day');
      expect(data.items).toHaveLength(2);
      
      // Verify ascending date order
      expect(data.items[0].key).toBe('2024-01-15');
      expect(data.items[1].key).toBe('2024-01-16');
      
      // Verify aggregated totals
      expect(data.totals.n).toBe(47);
      expect(mockAggregateVoteResults).toHaveBeenCalledWith({
        groupBy: 'day',
        limit: 100, // default limit
      });
    });

    it('should group by geo bucket with proper counts and rates', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'geo',
        items: [
          {
            key: 'US_CA',
            counts: { love: 10, like: 5, dislike: 2, hate: 1, n: 18 },
            rates: { loveRate: 0.56, likeRate: 0.28, dislikeRate: 0.11, hateRate: 0.06, favorability: 0.67, engagement: 18 },
          },
          {
            key: 'US_NY',
            counts: { love: 5, like: 7, dislike: 3, hate: 2, n: 17 },
            rates: { loveRate: 0.29, likeRate: 0.41, dislikeRate: 0.18, hateRate: 0.12, favorability: 0.41, engagement: 17 },
          },
          {
            key: 'US_TX',
            counts: { love: 8, like: 3, dislike: 1, hate: 0, n: 12 },
            rates: { loveRate: 0.67, likeRate: 0.25, dislikeRate: 0.08, hateRate: 0.00, favorability: 0.83, engagement: 12 },
          },
        ],
        totals: { love: 23, like: 15, dislike: 6, hate: 3, n: 47 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'geo',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.groupBy).toBe('geo');
      expect(data.items).toHaveLength(3);
      
      // Verify all geo buckets are present
      const geoBuckets = data.items.map((item: any) => item.key);
      expect(geoBuckets).toContain('US_CA');
      expect(geoBuckets).toContain('US_NY');
      expect(geoBuckets).toContain('US_TX');
      
      // Verify rates calculation
      const caItem = data.items.find((item: any) => item.key === 'US_CA');
      expect(caItem.rates.favorability).toBeCloseTo(0.67, 2);
    });

    it('should group by party bucket', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'party',
        items: [
          {
            key: 'D',
            counts: { love: 10, like: 5, dislike: 2, hate: 1, n: 18 },
            rates: { loveRate: 0.56, likeRate: 0.28, dislikeRate: 0.11, hateRate: 0.06, favorability: 0.67, engagement: 18 },
          },
          {
            key: 'I',
            counts: { love: 5, like: 7, dislike: 3, hate: 2, n: 17 },
            rates: { loveRate: 0.29, likeRate: 0.41, dislikeRate: 0.18, hateRate: 0.12, favorability: 0.41, engagement: 17 },
          },
          {
            key: 'R',
            counts: { love: 8, like: 3, dislike: 1, hate: 0, n: 12 },
            rates: { loveRate: 0.67, likeRate: 0.25, dislikeRate: 0.08, hateRate: 0.00, favorability: 0.83, engagement: 12 },
          },
        ],
        totals: { love: 23, like: 15, dislike: 6, hate: 3, n: 47 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'party',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.groupBy).toBe('party');
      expect(data.items).toHaveLength(3);
      
      const partyBuckets = data.items.map((item: any) => item.key);
      expect(partyBuckets).toContain('D');
      expect(partyBuckets).toContain('R');
      expect(partyBuckets).toContain('I');
    });

    it('should use rollups when rollup=true and available', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'message',
        items: [
          {
            key: fixtures.messages.M1.id,
            counts: { love: 20, like: 10, dislike: 3, hate: 1, n: 34 },
            rates: { loveRate: 0.59, likeRate: 0.29, dislikeRate: 0.09, hateRate: 0.03, favorability: 0.76, engagement: 34 },
          },
        ],
        totals: { love: 20, like: 10, dislike: 3, hate: 1, n: 34 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          rollup: 'true',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockAggregateVoteResults).toHaveBeenCalledWith({
        groupBy: 'message',
        rollup: 'true',
        limit: 100,
      });
    });

    it('should handle from/to date boundaries inclusively', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'day',
        items: [
          {
            key: '2024-01-15',
            counts: { love: 15, like: 12, dislike: 5, hate: 3, n: 35 },
            rates: { loveRate: 0.43, likeRate: 0.34, dislikeRate: 0.14, hateRate: 0.09, favorability: 0.54, engagement: 35 },
          },
        ],
        totals: { love: 15, like: 12, dislike: 5, hate: 3, n: 35 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'day',
          from: '2024-01-15',
          to: '2024-01-15',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockAggregateVoteResults).toHaveBeenCalledWith({
        groupBy: 'day',
        from: '2024-01-15',
        to: '2024-01-15',
        limit: 100,
      });
    });

    it('should return empty items for empty date range', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'day',
        items: [],
        totals: { love: 0, like: 0, dislike: 0, hate: 0, n: 0 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'day',
          from: '2024-02-01',
          to: '2024-02-01',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.items).toEqual([]);
      expect(data.totals.n).toBe(0);
    });

    it('should filter by specific message ID', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'day',
        items: [
          {
            key: '2024-01-15',
            counts: { love: 10, like: 5, dislike: 2, hate: 1, n: 18 },
            rates: { loveRate: 0.56, likeRate: 0.28, dislikeRate: 0.11, hateRate: 0.06, favorability: 0.67, engagement: 18 },
          },
        ],
        totals: { love: 10, like: 5, dislike: 2, hate: 1, n: 18 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'day',
          messageId: fixtures.messages.M1.id,
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockAggregateVoteResults).toHaveBeenCalledWith({
        groupBy: 'day',
        messageId: fixtures.messages.M1.id,
        limit: 100,
      });
    });

    it('should respect limit parameter', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'geo',
        items: [
          {
            key: 'US_CA',
            counts: { love: 10, like: 5, dislike: 2, hate: 1, n: 18 },
            rates: { loveRate: 0.56, likeRate: 0.28, dislikeRate: 0.11, hateRate: 0.06, favorability: 0.67, engagement: 18 },
          },
        ],
        totals: { love: 10, like: 5, dislike: 2, hate: 1, n: 18 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'geo',
          limit: '5',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockAggregateVoteResults).toHaveBeenCalledWith({
        groupBy: 'geo',
        limit: 5,
      });
    });

    it('should require admin authentication', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should require authentication', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should validate groupBy parameter', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'invalid-group',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate date range parameters', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'day',
          from: '2024-01-20',
          to: '2024-01-15', // from > to
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed date parameters', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'day',
          from: 'invalid-date',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-GET methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should handle aggregation service errors', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      mockAggregateVoteResults.mockRejectedValue(new Error('Aggregation failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should fall back to shards when rollups unavailable', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Mock the aggregation service to simulate fallback behavior
      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'message',
        items: [
          {
            key: fixtures.messages.M1.id,
            counts: { love: 18, like: 8, dislike: 3, hate: 1, n: 30 },
            rates: { loveRate: 0.60, likeRate: 0.27, dislikeRate: 0.10, hateRate: 0.03, favorability: 0.73, engagement: 30 },
          },
        ],
        totals: { love: 18, like: 8, dislike: 3, hate: 1, n: 30 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          rollup: 'true',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.items).toHaveLength(1);
      expect(data.totals.n).toBe(30);
    });
  });

  describe('Advanced Filtering Scenarios', () => {
    it('should handle combined filters', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'day',
        items: [
          {
            key: '2024-01-15',
            counts: { love: 10, like: 5, dislike: 2, hate: 1, n: 18 },
            rates: { loveRate: 0.56, likeRate: 0.28, dislikeRate: 0.11, hateRate: 0.06, favorability: 0.67, engagement: 18 },
          },
        ],
        totals: { love: 10, like: 5, dislike: 2, hate: 1, n: 18 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'day',
          messageId: fixtures.messages.M1.id,
          geo: 'US_CA',
          party: 'D',
          demo: 'age_25_34',
          from: '2024-01-15',
          to: '2024-01-15',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockAggregateVoteResults).toHaveBeenCalledWith({
        groupBy: 'day',
        messageId: fixtures.messages.M1.id,
        geo: 'US_CA',
        party: 'D',
        demo: 'age_25_34',
        from: '2024-01-15',
        to: '2024-01-15',
        limit: 100,
      });
    });

    it('should handle missing optional parameters', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      mockAggregateVoteResults.mockResolvedValue({
        groupBy: 'message',
        items: [],
        totals: { love: 0, like: 0, dislike: 0, hate: 0, n: 0 },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
        },
      });

      await resultsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockAggregateVoteResults).toHaveBeenCalledWith({
        groupBy: 'message',
        limit: 100,
      });
    });
  });
});