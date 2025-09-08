/**
 * End-to-End Tests: Complete Voting Flow
 * 
 * Tests complete user journeys and system integration for the voting functionality.
 * These tests focus on multi-step workflows that span multiple API endpoints.
 */

import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
import type { TestFixtures } from '../fixtures/testData';

// Import API handlers for direct testing
import messagesHandler from '@/pages/api/messages';
import voteBatchHandler from '@/pages/api/messages/vote-batch';
import resultsHandler from '@/pages/api/admin/messages/results';

// Mock dependencies
jest.mock('@/lib/datastoreServer', () => {
  let mockDatastore: any = null;
  return {
    get datastore() { return mockDatastore; },
    set datastore(ds: any) { mockDatastore = ds; },
    fromDatastore: jest.fn((entity: any) => {
      const { [Symbol.for('KEY')]: key, ...data } = entity;
      return { ...data, id: key?.id || key?.name };
    }),
    DATASTORE_NAMESPACE: 'test',
  };
});

jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/vote-aggregation-service', () => ({ processVoteBatch: jest.fn() }));
jest.mock('@/lib/rate-limiting', () => ({ withRateLimit: jest.fn((limiter, handler) => handler) }));
jest.mock('@/lib/bucket-derivation', () => ({ deriveAllBuckets: jest.fn(() => ({ geoBucket: 'US_CA', partyBucket: 'D', demoBucket: 'age_25_34' })) }));
jest.mock('@/lib/admin-auth-middleware', () => ({
  withAdminAuth: jest.fn((handler) => async (req: any, res: any) => {
    const session = await require('next-auth/react').getSession({ req });
    if (!session) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    if (session.user.role !== 'admin') return res.status(403).json({ error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin access required' } });
    req.user = session.user;
    return handler(req, res);
  }),
  validateMethod: jest.fn((req, res, methods) => methods.includes(req.method)),
  setStandardHeaders: jest.fn(),
  setCacheHeaders: jest.fn(),
}));

const mockGetSession = require('next-auth/react').getSession;
const mockProcessVoteBatch = require('@/lib/vote-aggregation-service').processVoteBatch;

describe('E2E: Complete Voting System', () => {
  let fixtures: TestFixtures;

  beforeEach(async () => {
    fixtures = await createTestFixtures();
    const datastoreModule = require('@/lib/datastoreServer');
    datastoreModule.datastore = fixtures.datastore;
    jest.clearAllMocks();
    mockProcessVoteBatch.mockImplementation(async (votes: any[]) => ({ accepted: votes.length, dropped: 0 }));
  });

  afterEach(async () => {
    await resetFixtures(fixtures);
  });

  describe('Complete User Voting Journey', () => {
    it('should handle end-to-end voting workflow from message retrieval to analytics', async () => {
      // Step 1: User retrieves available messages
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      expect(getRes._getStatusCode()).toBe(200);
      
      const messages = JSON.parse(getRes._getData());
      expect(messages).toHaveLength(3);
      expect(messages.every((m: any) => m.status === 'active')).toBe(true);

      // Step 2: Anonymous user submits votes
      mockGetSession.mockResolvedValue(null);
      const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            { messageId: messages[0].id, choice: 1, votedAtClient: new Date().toISOString() }, // Love
            { messageId: messages[1].id, choice: 2, votedAtClient: new Date().toISOString() }, // Like
          ],
          userContext: { geoBucket: 'US_CA', partyBucket: 'D', demoBucket: 'age_25_34' },
          idempotencyKey: 'e2e-test-1',
        },
      });

      await voteBatchHandler(voteReq, voteRes);
      if (voteRes._getStatusCode() !== 200) {
        console.log('Vote batch error:', JSON.parse(voteRes._getData()));
      }
      expect(voteRes._getStatusCode()).toBe(200);
      
      const voteResult = JSON.parse(voteRes._getData());
      expect(voteResult.accepted).toBe(2);
      expect(voteResult.dropped).toBe(0);

      // Step 3: Authenticated user submits different votes
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));
      const { req: authVoteReq, res: authVoteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            { messageId: messages[2].id, choice: 3, votedAtClient: new Date().toISOString() }, // Dislike
            { messageId: messages[3].id, choice: 4, votedAtClient: new Date().toISOString() }, // Hate
          ],
          idempotencyKey: 'e2e-test-2',
        },
      });

      await voteBatchHandler(authVoteReq, authVoteRes);
      expect(authVoteRes._getStatusCode()).toBe(200);
      
      const authVoteResult = JSON.parse(authVoteRes._getData());
      expect(authVoteResult.accepted).toBe(2);

      // Step 4: Admin retrieves analytics
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      const { req: analyticsReq, res: analyticsRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { groupBy: 'message', rollup: 'false' },
      });

      await resultsHandler(analyticsReq, analyticsRes);
      expect(analyticsRes._getStatusCode()).toBe(200);
      
      const analyticsResult = JSON.parse(analyticsRes._getData());
      expect(analyticsResult.items).toBeDefined();
      expect(analyticsResult.total).toBeGreaterThanOrEqual(0);

      // Step 5: Verify data consistency
      expect(mockProcessVoteBatch).toHaveBeenCalledTimes(2);
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ messageId: messages[0].id, choice: 1 }),
          expect.objectContaining({ messageId: messages[1].id, choice: 2 }),
        ]),
        expect.objectContaining({ geoBucket: 'US_CA', partyBucket: 'D', demoBucket: 'age_25_34' }),
        undefined, // Anonymous user
        expect.any(String)
      );
    });

    it('should handle idempotency across the complete workflow', async () => {
      // Get messages
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());

      // Submit votes with specific idempotency key
      mockGetSession.mockResolvedValue(null);
      const voteData = {
        votes: [{ messageId: messages[0].id, choice: 1, votedAtClient: new Date().toISOString() }],
        idempotencyKey: 'idempotency-test',
      };

      // First submission
      const { req: req1, res: res1 } = createMocks<NextApiRequest, NextApiResponse>({ method: 'POST', body: voteData });
      await voteBatchHandler(req1, res1);
      expect(res1._getStatusCode()).toBe(200);
      expect(JSON.parse(res1._getData()).accepted).toBe(1);

      // Duplicate submission with same idempotency key
      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({ method: 'POST', body: voteData });
      await voteBatchHandler(req2, res2);
      expect(res2._getStatusCode()).toBe(200);
      expect(JSON.parse(res2._getData()).accepted).toBe(0); // Should be deduplicated
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle system errors gracefully throughout the workflow', async () => {
      // Test invalid vote data
      mockGetSession.mockResolvedValue(null);
      const { req: invalidReq, res: invalidRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [{ messageId: 'invalid-id', choice: 5, votedAtClient: 'invalid-date' }],
          idempotencyKey: 'error-test',
        },
      });

      await voteBatchHandler(invalidReq, invalidRes);
      expect(invalidRes._getStatusCode()).toBe(400);
      
      const error = JSON.parse(invalidRes._getData());
      expect(error.error.code).toBe('INVALID_INPUT');

      // Test unauthorized analytics access
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));
      const { req: unauthReq, res: unauthRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { groupBy: 'message' },
      });

      await resultsHandler(unauthReq, unauthRes);
      expect(unauthRes._getStatusCode()).toBe(403);
    });

    it('should maintain data consistency under concurrent operations', async () => {
      // Get messages
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());

      // Simulate concurrent voting
      mockGetSession.mockResolvedValue(null);
      const concurrentVotes = Array.from({ length: 5 }, (_, i) => ({
        method: 'POST' as const,
        body: {
          votes: [{ messageId: messages[0].id, choice: (i % 4) + 1, votedAtClient: new Date().toISOString() }],
          idempotencyKey: `concurrent-${i}`,
        },
      }));

      // Execute concurrent requests
      const responses = await Promise.all(
        concurrentVotes.map(async (voteConfig) => {
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>(voteConfig);
          await voteBatchHandler(req, res);
          return res;
        })
      );

      // All should succeed
      responses.forEach(res => {
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData()).accepted).toBe(1);
      });

      // Verify total processing
      expect(mockProcessVoteBatch).toHaveBeenCalledTimes(5);
    });
  });

  describe('Integration with User Context and Analytics', () => {
    it('should properly flow user context through the entire system', async () => {
      // Test different user contexts
      const userContexts = [
        { geoBucket: 'US_CA', partyBucket: 'D', demoBucket: 'age_25_34' },
        { geoBucket: 'US_TX', partyBucket: 'R', demoBucket: 'age_35_44' },
        { geoBucket: 'US_NY', partyBucket: 'I', demoBucket: 'age_45_54' },
      ];

      // Get messages
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());

      // Submit votes with different contexts
      for (let i = 0; i < userContexts.length; i++) {
        mockGetSession.mockResolvedValue(null);
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [{ messageId: messages[i % messages.length].id, choice: (i % 4) + 1, votedAtClient: new Date().toISOString() }],
            userContext: userContexts[i],
            idempotencyKey: `context-test-${i}`,
          },
        });

        await voteBatchHandler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }

      // Verify context was properly passed to processing
      userContexts.forEach((context, i) => {
        expect(mockProcessVoteBatch).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining(context),
          undefined,
          expect.any(String)
        );
      });

      // Test analytics with context filtering
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      const { req: filterReq, res: filterRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { groupBy: 'party', party: 'D' },
      });

      await resultsHandler(filterReq, filterRes);
      expect(filterRes._getStatusCode()).toBe(200);
      
      const filteredResults = JSON.parse(filterRes._getData());
      expect(filteredResults.filters.party).toBe('D');
    });

    it('should handle voting session completion', async () => {
      // Get all messages
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      expect(getRes._getStatusCode()).toBe(200);
      const messages = JSON.parse(getRes._getData());

      // Vote on all messages to complete session
      const allVotes = messages.map((message: any, index: number) => ({
        messageId: message.id,
        choice: (index % 4) + 1, // Cycle through all choices
        votedAtClient: new Date().toISOString(),
      }));

      mockGetSession.mockResolvedValue(null);
      const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: allVotes,
          userContext: {
            geoBucket: 'US_NY',
            partyBucket: 'R',
            demoBucket: 'age_35_44',
          },
          idempotencyKey: 'complete-session',
        },
      });

      await voteBatchHandler(voteReq, voteRes);
      expect(voteRes._getStatusCode()).toBe(200);
      const result = JSON.parse(voteRes._getData());
      expect(result.accepted).toBe(messages.length);
      expect(result.dropped).toBe(0);

      // Verify completion state can be determined
      // (In real app, this would involve checking localStorage or session state)
      const votedMessageIds = new Set(allVotes.map(v => v.messageId));
      expect(votedMessageIds.size).toBe(messages.length);
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle network errors gracefully with retry', async () => {
      // First, vote successfully
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());

      mockGetSession.mockResolvedValue(null);
      const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: messages[0].id,
              choice: 1,
              votedAtClient: new Date().toISOString(),
            },
          ],
          idempotencyKey: 'retry-test-1',
        },
      });

      // First vote succeeds
      await voteBatchHandler(voteReq, voteRes);
      expect(voteRes._getStatusCode()).toBe(200);

      // Simulate network error by attempting invalid operation
      const { req: errorReq, res: errorRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: 'invalid-message-id',
              choice: 1,
              votedAtClient: new Date().toISOString(),
            },
          ],
          idempotencyKey: 'retry-test-2',
        },
      });

      await voteBatchHandler(errorReq, errorRes);
      expect(errorRes._getStatusCode()).toBe(400);

      // Verify original vote still exists
      const shardKeys = [];
      for (let i = 0; i < 10; i++) {
        shardKeys.push(fixtures.datastore.key([
          'VoteAggregateShard',
          `${messages[0].id}|ALL|ALL|ALL|${i}`,
        ]));
      }

      const [shardEntities] = await fixtures.datastore.get(shardKeys);
      const totalVotes = shardEntities.reduce((sum: number, shard: any) => {
        if (!shard) return sum;
        return sum + (shard.love || 0) + (shard.like || 0) + (shard.dislike || 0) + (shard.hate || 0);
      }, 0);

      expect(totalVotes).toBeGreaterThan(0);
    });

    it('should prevent duplicate votes with idempotency', async () => {
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());

      const voteData = {
        votes: [
          {
            messageId: messages[0].id,
            choice: 1,
            votedAtClient: new Date().toISOString(),
          },
        ],
        idempotencyKey: 'duplicate-test',
      };

      mockGetSession.mockResolvedValue(null);
      
      // First vote
      const { req: voteReq1, res: voteRes1 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: voteData,
      });

      await voteBatchHandler(voteReq1, voteRes1);
      expect(voteRes1._getStatusCode()).toBe(200);
      const result1 = JSON.parse(voteRes1._getData());
      expect(result1.accepted).toBe(1);

      // Duplicate vote with same idempotency key
      const { req: voteReq2, res: voteRes2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: voteData,
      });

      await voteBatchHandler(voteReq2, voteRes2);
      expect(voteRes2._getStatusCode()).toBe(200);
      const result2 = JSON.parse(voteRes2._getData());
      expect(result2.accepted).toBe(0); // Should be 0 due to idempotency

      // Verify only one vote was counted
      const shardKeys = [];
      for (let i = 0; i < 10; i++) {
        shardKeys.push(fixtures.datastore.key([
          'VoteAggregateShard',
          `${messages[0].id}|ALL|ALL|ALL|${i}`,
        ]));
      }

      const [shardEntities] = await fixtures.datastore.get(shardKeys);
      const totalLoveVotes = shardEntities.reduce((sum: number, shard: any) => {
        return sum + (shard ? (shard.love || 0) : 0);
      }, 0);

      expect(totalLoveVotes).toBe(1); // Only one vote should be recorded
    });

    it('should handle invalid vote choices gracefully', async () => {
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());

      mockGetSession.mockResolvedValue(null);
      const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: messages[0].id,
              choice: 5, // Invalid choice (should be 1-4)
              votedAtClient: new Date().toISOString(),
            },
          ],
          idempotencyKey: 'invalid-choice-test',
        },
      });

      await voteBatchHandler(voteReq, voteRes);
      expect(voteRes._getStatusCode()).toBe(400);

      const error = JSON.parse(voteRes._getData());
      expect(error.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('Vote Aggregation and Consistency', () => {
    it('should correctly aggregate votes across multiple sessions', async () => {
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      const messageId = messages[0].id;

      // Simulate multiple users voting on the same message
      const sessions = [
        { geo: 'US_CA', party: 'D', demo: 'age_25_34', choice: 1 }, // Love
        { geo: 'US_NY', party: 'R', demo: 'age_35_44', choice: 1 }, // Love
        { geo: 'US_TX', party: 'D', demo: 'age_45_54', choice: 2 }, // Like
        { geo: 'US_FL', party: 'I', demo: 'age_25_34', choice: 3 }, // Dislike
        { geo: 'US_WA', party: 'R', demo: 'age_35_44', choice: 4 }, // Hate
      ];

      mockGetSession.mockResolvedValue(null);
      
      // Submit votes from different sessions
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId,
                choice: session.choice,
                votedAtClient: new Date().toISOString(),
              },
            ],
            userContext: {
              geoBucket: session.geo,
              partyBucket: session.party,
              demoBucket: session.demo,
            },
            idempotencyKey: `session-${i}`,
          },
        });

        await voteBatchHandler(voteReq, voteRes);
        expect(voteRes._getStatusCode()).toBe(200);
        const result = JSON.parse(voteRes._getData());
        expect(result.accepted).toBe(1);
      }

      // Verify total aggregation
      const shardKeys = [];
      for (let i = 0; i < 10; i++) {
        shardKeys.push(fixtures.datastore.key([
          'VoteAggregateShard',
          `${messageId}|ALL|ALL|ALL|${i}`,
        ]));
      }

      const [shardEntities] = await fixtures.datastore.get(shardKeys);
      const totals = shardEntities.reduce((acc: any, shard: any) => {
        if (!shard) return acc;
        return {
          love: acc.love + (shard.love || 0),
          like: acc.like + (shard.like || 0),
          dislike: acc.dislike + (shard.dislike || 0),
          hate: acc.hate + (shard.hate || 0),
        };
      }, { love: 0, like: 0, dislike: 0, hate: 0 });

      expect(totals.love).toBe(2); // 2 love votes
      expect(totals.like).toBe(1); // 1 like vote
      expect(totals.dislike).toBe(1); // 1 dislike vote
      expect(totals.hate).toBe(1); // 1 hate vote

      const totalVotes = totals.love + totals.like + totals.dislike + totals.hate;
      expect(totalVotes).toBe(sessions.length);
    });

    it('should maintain vote consistency under concurrent access', async () => {
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      const messageId = messages[0].id;

      mockGetSession.mockResolvedValue(null);
      
      // Simulate concurrent votes
      const concurrentVoteConfigs = Array.from({ length: 10 }, (_, i) => ({
        method: 'POST' as const,
        body: {
          votes: [
            {
              messageId,
              choice: (i % 4) + 1,
              votedAtClient: new Date().toISOString(),
            },
          ],
          idempotencyKey: `concurrent-${i}`,
        },
      }));

      // Submit all votes concurrently
      const responses = await Promise.all(
        concurrentVoteConfigs.map(async (voteConfig) => {
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>(voteConfig);
          await voteBatchHandler(req, res);
          return res;
        })
      );

      // All should succeed
      for (const response of responses) {
        expect(response._getStatusCode()).toBe(200);
      }

      // Verify total count matches expected
      const shardKeys = [];
      for (let i = 0; i < 10; i++) {
        shardKeys.push(fixtures.datastore.key([
          'VoteAggregateShard',
          `${messageId}|ALL|ALL|ALL|${i}`,
        ]));
      }

      const [shardEntities] = await fixtures.datastore.get(shardKeys);
      const totalVotes = shardEntities.reduce((sum: number, shard: any) => {
        if (!shard) return sum;
        return sum + (shard.love || 0) + (shard.like || 0) + (shard.dislike || 0) + (shard.hate || 0);
      }, 0);

      expect(totalVotes).toBe(concurrentVotes.length);
    });
  });

  describe('User Context and Bucketing', () => {
    it('should correctly apply user context bucketing', async () => {
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      const messageId = messages[0].id;

      mockGetSession.mockResolvedValue(null);
      const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId,
              choice: 1,
              votedAtClient: new Date().toISOString(),
            },
          ],
          userContext: {
            geoBucket: 'US_CA',
            partyBucket: 'D',
            demoBucket: 'age_25_34',
          },
          idempotencyKey: 'bucketing-test',
        },
      });

      await voteBatchHandler(voteReq, voteRes);
      expect(voteRes._getStatusCode()).toBe(200);

      // Check that vote was recorded with correct bucketing
      // (In real implementation, this would check geo/party/demo specific shards)
      const allShardKeys = [];
      
      // Check ALL bucket
      for (let i = 0; i < 10; i++) {
        allShardKeys.push(fixtures.datastore.key([
          'VoteAggregateShard',
          `${messageId}|ALL|ALL|ALL|${i}`,
        ]));
      }

      const [allShards] = await fixtures.datastore.get(allShardKeys);
      const hasVotesInAllBucket = allShards.some((shard: any) => shard && shard.love > 0);
      expect(hasVotesInAllBucket).toBe(true);
    });

    it('should handle missing user context gracefully', async () => {
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());

      mockGetSession.mockResolvedValue(null);
      const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: messages[0].id,
              choice: 1,
              votedAtClient: new Date().toISOString(),
            },
          ],
          // No userContext provided
          idempotencyKey: 'no-context-test',
        },
      });

      await voteBatchHandler(voteReq, voteRes);
      expect(voteRes._getStatusCode()).toBe(200);
      const result = JSON.parse(voteRes._getData());
      expect(result.accepted).toBe(1);
    });
  });
});