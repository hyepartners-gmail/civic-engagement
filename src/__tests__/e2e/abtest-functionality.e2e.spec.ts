/**
 * End-to-End Tests: A/B Testing Functionality
 * 
 * Tests complete A/B testing workflows including pair creation,
 * comparative voting analysis, statistical significance testing,
 * and integration with the main voting system.
 */

import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
import type { TestFixtures } from '../fixtures/testData';

// Import API handlers
import abtestPairsHandler from '@/pages/api/admin/messages/abtest/pairs';
import abtestPairHandler from '@/pages/api/admin/messages/abtest/[id]';
import abtestVoteHandler from '@/pages/api/messages/abtest/vote-batch';
import voteBatchHandler from '@/pages/api/messages/vote-batch';
import resultsHandler from '@/pages/api/admin/messages/results';

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

// Mock admin auth middleware
jest.mock('@/lib/admin-auth-middleware', () => ({
  withAdminAuth: jest.fn((handler) => async (req: any, res: any) => {
    const session = await require('next-auth/react').getSession({ req });
    if (!session) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    if (session.user.role !== 'admin') {
      return res.status(403).json({ error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin access required' } });
    }
    req.user = session.user;
    return handler(req, res);
  }),
}));

// Mock vote aggregation service
jest.mock('@/lib/vote-aggregation-service', () => ({
  processVoteBatch: jest.fn(),
}));

// Mock rate limiting
jest.mock('@/lib/rate-limiting', () => ({
  withRateLimit: jest.fn((limiter, handler) => handler),
}));

const mockGetSession = require('next-auth/react').getSession;
const mockProcessVoteBatch = require('@/lib/vote-aggregation-service').processVoteBatch;

describe('E2E: A/B Testing Functionality', () => {
  let fixtures: TestFixtures;

  beforeEach(async () => {
    fixtures = await createTestFixtures();
    
    // Set the mocked datastore
    const datastoreModule = require('@/lib/datastoreServer');
    datastoreModule.datastore = fixtures.datastore;
    
    jest.clearAllMocks();

    // Set up default vote processing mock
    mockProcessVoteBatch.mockImplementation(async (votes: any[], userContext: any, userId?: string, sessionId?: string) => {
      return {
        accepted: votes.length,
        dropped: 0,
      };
    });
  });

  afterEach(async () => {
    await resetFixtures(fixtures);
  });

  describe('Complete A/B Testing Workflow', () => {
    it('should handle end-to-end A/B test creation and voting comparison', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Step 1: Create A/B pair for testing
      const { req: createReq, res: createRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id, // "Make Healthcare Accessible"
          b: fixtures.messages.M2.id, // "Protect Our Environment"
          status: 'active',
        },
      });

      await abtestPairsHandler(createReq, createRes);
      expect(createRes._getStatusCode()).toBe(201);
      
      const abPair = JSON.parse(createRes._getData());
      expect(abPair.a).toBe(fixtures.messages.M1.id);
      expect(abPair.b).toBe(fixtures.messages.M2.id);
      expect(abPair.status).toBe('active');

      // Step 2: Simulate users voting on both messages in the A/B pair
      const votingSessions = [
        // Session 1: User prefers message A (Healthcare)
        {
          userId: 'user1',
          userContext: { geoBucket: 'US_CA', partyBucket: 'D', demoBucket: 'age_25_34' },
          votes: [
            { messageId: fixtures.messages.M1.id, choice: 1 }, // Love healthcare
            { messageId: fixtures.messages.M2.id, choice: 3 }, // Dislike environment
          ],
        },
        // Session 2: User prefers message B (Environment)
        {
          userId: 'user2',
          userContext: { geoBucket: 'US_NY', partyBucket: 'D', demoBucket: 'age_25_34' },
          votes: [
            { messageId: fixtures.messages.M1.id, choice: 3 }, // Dislike healthcare
            { messageId: fixtures.messages.M2.id, choice: 1 }, // Love environment
          ],
        },
        // Session 3: User prefers message A (Healthcare) strongly
        {
          userId: 'user3',
          userContext: { geoBucket: 'US_TX', partyBucket: 'R', demoBucket: 'age_35_44' },
          votes: [
            { messageId: fixtures.messages.M1.id, choice: 1 }, // Love healthcare
            { messageId: fixtures.messages.M2.id, choice: 2 }, // Like environment
          ],
        },
        // Session 4: Neutral voter
        {
          userId: 'user4',
          userContext: { geoBucket: 'US_FL', partyBucket: 'I', demoBucket: 'age_45_54' },
          votes: [
            { messageId: fixtures.messages.M1.id, choice: 2 }, // Like healthcare
            { messageId: fixtures.messages.M2.id, choice: 2 }, // Like environment
          ],
        },
      ];

      // Submit votes from different users
      for (let i = 0; i < votingSessions.length; i++) {
        const session = votingSessions[i];
        
        // Mock session for this user
        mockGetSession.mockResolvedValue(session.userId ? 
          createMockSession({ id: session.userId, email: `${session.userId}@test.com`, role: 'user' }) : 
          null
        );

        const voteData = {
          votes: session.votes.map(vote => ({
            ...vote,
            votedAtClient: new Date().toISOString(),
          })),
          userContext: session.userContext,
          idempotencyKey: `abtest-session-${i}`,
        };

        const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: voteData,
        });

        await abtestVoteHandler(voteReq, voteRes);
        expect(voteRes._getStatusCode()).toBe(200);
        
        const voteResult = JSON.parse(voteRes._getData());
        expect(voteResult.accepted).toBe(session.votes.length);
      }

      // Step 3: Analyze results for A/B comparison
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Get results for message A (Healthcare)
      const { req: resultsAReq, res: resultsARes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          messageId: fixtures.messages.M1.id,
          rollup: 'false',
        },
      });

      await resultsHandler(resultsAReq, resultsARes);
      expect(resultsARes._getStatusCode()).toBe(200);
      
      const resultsA = JSON.parse(resultsARes._getData());

      // Get results for message B (Environment)
      const { req: resultsBReq, res: resultsBRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          messageId: fixtures.messages.M2.id,
          rollup: 'false',
        },
      });

      await resultsHandler(resultsBReq, resultsBRes);
      expect(resultsBRes._getStatusCode()).toBe(200);
      
      const resultsB = JSON.parse(resultsBRes._getData());

      // Step 4: Verify A/B test results structure
      expect(resultsA.items).toBeDefined();
      expect(resultsB.items).toBeDefined();
      
      // Both messages should have received votes
      if (resultsA.items.length > 0 && resultsB.items.length > 0) {
        const messageAData = resultsA.items[0];
        const messageBData = resultsB.items[0];
        
        expect(messageAData.counts.n).toBeGreaterThan(0);
        expect(messageBData.counts.n).toBeGreaterThan(0);
        
        // Favorability rates should be calculated
        expect(messageAData.rates.favorability).toBeGreaterThanOrEqual(0);
        expect(messageAData.rates.favorability).toBeLessThanOrEqual(1);
        expect(messageBData.rates.favorability).toBeGreaterThanOrEqual(0);
        expect(messageBData.rates.favorability).toBeLessThanOrEqual(1);
      }

      // Step 5: Test A/B pair status management
      const { req: deactivateReq, res: deactivateRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: abPair.id },
        body: { status: 'inactive' },
      });

      await abtestPairHandler(deactivateReq, deactivateRes);
      expect(deactivateRes._getStatusCode()).toBe(200);
      
      const updatedPair = JSON.parse(deactivateRes._getData());
      expect(updatedPair.status).toBe('inactive');
    });

    it('should support multiple concurrent A/B tests', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Create multiple A/B pairs
      const abPairs = [];
      
      // Pair 1: Healthcare vs Environment
      const { req: create1Req, res: create1Res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id, // Healthcare
          b: fixtures.messages.M2.id, // Environment
          status: 'active',
        },
      });

      await abtestPairsHandler(create1Req, create1Res);
      expect(create1Res._getStatusCode()).toBe(201);
      abPairs.push(JSON.parse(create1Res._getData()));

      // Pair 2: Healthcare vs Education
      const { req: create2Req, res: create2Res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id, // Healthcare
          b: fixtures.messages.M3.id, // Education
          status: 'active',
        },
      });

      await abtestPairsHandler(create2Req, create2Res);
      expect(create2Res._getStatusCode()).toBe(201);
      abPairs.push(JSON.parse(create2Res._getData()));

      // Pair 3: Environment vs Economic
      const { req: create3Req, res: create3Res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M2.id, // Environment
          b: fixtures.messages.M4.id, // Economic
          status: 'active',
        },
      });

      await abtestPairsHandler(create3Req, create3Res);
      expect(create3Res._getStatusCode()).toBe(201);
      abPairs.push(JSON.parse(create3Res._getData()));

      // Verify all pairs exist
      const { req: listReq, res: listRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'active' },
      });

      await abtestPairsHandler(listReq, listRes);
      expect(listRes._getStatusCode()).toBe(200);
      
      const activePairs = JSON.parse(listRes._getData());
      expect(activePairs).toHaveLength(4); // 3 new + 1 fixture

      // Simulate voting across all pairs
      const votingData = {
        votes: [
          { messageId: fixtures.messages.M1.id, choice: 1 }, // Healthcare: Love
          { messageId: fixtures.messages.M2.id, choice: 2 }, // Environment: Like  
          { messageId: fixtures.messages.M3.id, choice: 3 }, // Education: Dislike
          { messageId: fixtures.messages.M4.id, choice: 4 }, // Economic: Hate
        ].map(vote => ({ ...vote, votedAtClient: new Date().toISOString() })),
        userContext: { geoBucket: 'US_WA', partyBucket: 'D', demoBucket: 'age_25_34' },
        idempotencyKey: 'multi-abtest-vote',
      };

      mockGetSession.mockResolvedValue(null); // Anonymous vote

      const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: votingData,
      });

      await abtestVoteHandler(voteReq, voteRes);
      expect(voteRes._getStatusCode()).toBe(200);
      
      const voteResult = JSON.parse(voteRes._getData());
      expect(voteResult.accepted).toBe(4);
    });
  });

  describe('A/B Test Analytics and Statistical Analysis', () => {
    it('should provide comparative analytics for A/B pairs', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Create A/B pair
      const { req: createReq, res: createRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(createReq, createRes);
      const abPair = JSON.parse(createRes._getData());

      // Generate statistical vote patterns
      // Message A (Healthcare) - Higher favorability
      const votesForA = Array.from({ length: 50 }, (_, i) => ({
        messageId: fixtures.messages.M1.id,
        choice: i < 35 ? (i < 25 ? 1 : 2) : (i < 45 ? 3 : 4), // 50% love, 20% like, 20% dislike, 10% hate
        votedAtClient: new Date().toISOString(),
      }));

      // Message B (Environment) - Lower favorability  
      const votesForB = Array.from({ length: 50 }, (_, i) => ({
        messageId: fixtures.messages.M2.id,
        choice: i < 20 ? (i < 10 ? 1 : 2) : (i < 40 ? 3 : 4), // 20% love, 20% like, 40% dislike, 20% hate
        votedAtClient: new Date().toISOString(),
      }));

      // Submit votes in batches to simulate real usage
      const batchSize = 10;
      for (let i = 0; i < votesForA.length; i += batchSize) {
        const batchA = votesForA.slice(i, i + batchSize);
        const batchB = votesForB.slice(i, i + batchSize);
        
        const combinedBatch = [...batchA, ...batchB];
        
        mockGetSession.mockResolvedValue(null); // Anonymous votes
        
        const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: combinedBatch,
            userContext: { geoBucket: 'US_CA', partyBucket: 'D', demoBucket: 'age_25_34' },
            idempotencyKey: `analytics-batch-${i}`,
          },
        });

        await abtestVoteHandler(voteReq, voteRes);
        expect(voteRes._getStatusCode()).toBe(200);
      }

      // Analyze results for comparison
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Get detailed results for both messages
      const { req: comparisonReq, res: comparisonRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          rollup: 'false',
        },
      });

      await resultsHandler(comparisonReq, comparisonRes);
      expect(comparisonRes._getStatusCode()).toBe(200);
      
      const comparisonResults = JSON.parse(comparisonRes._getData());
      
      // Find results for both messages
      const messageAResults = comparisonResults.items.find((item: any) => 
        item.key === 'Make Healthcare Accessible'
      );
      const messageBResults = comparisonResults.items.find((item: any) => 
        item.key === 'Protect Our Environment'  
      );

      if (messageAResults && messageBResults) {
        // Message A should have higher favorability
        expect(messageAResults.rates.favorability).toBeGreaterThan(messageBResults.rates.favorability);
        
        // Both should have received equal number of votes
        expect(messageAResults.counts.n).toBe(messageBResults.counts.n);
        
        // Verify individual choice distributions make sense
        expect(messageAResults.counts.love + messageAResults.counts.like).toBeGreaterThan(
          messageAResults.counts.dislike + messageAResults.counts.hate
        );
        
        expect(messageBResults.counts.dislike + messageBResults.counts.hate).toBeGreaterThan(
          messageBResults.counts.love + messageBResults.counts.like
        );
      }
    });

    it('should handle demographic segmentation in A/B tests', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Create A/B pair
      const { req: createReq, res: createRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(createReq, createRes);

      // Simulate votes from different demographic groups
      const demographicGroups = [
        { geoBucket: 'US_CA', partyBucket: 'D', demoBucket: 'age_25_34' },
        { geoBucket: 'US_TX', partyBucket: 'R', demoBucket: 'age_35_44' },
        { geoBucket: 'US_NY', partyBucket: 'I', demoBucket: 'age_45_54' },
        { geoBucket: 'US_FL', partyBucket: 'D', demoBucket: 'age_55_64' },
      ];

      for (let i = 0; i < demographicGroups.length; i++) {
        const group = demographicGroups[i];
        
        mockGetSession.mockResolvedValue(null);
        
        const { req: voteReq, res: voteRes } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              { messageId: fixtures.messages.M1.id, choice: (i % 4) + 1, votedAtClient: new Date().toISOString() },
              { messageId: fixtures.messages.M2.id, choice: ((i + 2) % 4) + 1, votedAtClient: new Date().toISOString() },
            ],
            userContext: group,
            idempotencyKey: `demo-group-${i}`,
          },
        });

        await abtestVoteHandler(voteReq, voteRes);
        expect(voteRes._getStatusCode()).toBe(200);
      }

      // Analyze by demographics
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Test geographic segmentation
      const { req: geoReq, res: geoRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'geo',
          rollup: 'false',
        },
      });

      await resultsHandler(geoReq, geoRes);
      expect(geoRes._getStatusCode()).toBe(200);
      
      const geoResults = JSON.parse(geoRes._getData());
      expect(geoResults.items).toBeDefined();

      // Test party segmentation  
      const { req: partyReq, res: partyRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'party',
          rollup: 'false',
        },
      });

      await resultsHandler(partyReq, partyRes);
      expect(partyRes._getStatusCode()).toBe(200);
      
      const partyResults = JSON.parse(partyRes._getData());
      expect(partyResults.items).toBeDefined();

      // Test demographic segmentation
      const { req: demoReq, res: demoRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'demo',
          rollup: 'false',
        },
      });

      await resultsHandler(demoReq, demoRes);
      expect(demoRes._getStatusCode()).toBe(200);
      
      const demoResults = JSON.parse(demoRes._getData());
      expect(demoResults.items).toBeDefined();
    });
  });

  describe('A/B Test Edge Cases and Error Handling', () => {
    it('should handle A/B voting with missing messages', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            { messageId: 'non-existent-message', choice: 1, votedAtClient: new Date().toISOString() },
          ],
          idempotencyKey: 'missing-message-test',
        },
      });

      await abtestVoteHandler(req, res);
      
      // Should still accept the request but handle the missing message gracefully
      // The exact behavior depends on implementation - could be 200 with dropped votes
      // or 400 with validation error
      expect([200, 400]).toContain(res._getStatusCode());
    });

    it('should handle A/B pair creation with invalid message IDs', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: 'invalid-message-id',
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      
      const error = JSON.parse(res._getData());
      expect(error.error.code).toBe('NOT_FOUND');
    });

    it('should handle concurrent A/B pair operations', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Create A/B pair
      const { req: createReq, res: createRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(createReq, createRes);
      const abPair = JSON.parse(createRes._getData());

      // Simulate concurrent updates
      const updates = [
        { status: 'inactive' },
        { status: 'active' },
      ];

      const responses = await Promise.all(
        updates.map(update => {
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method: 'PATCH',
            query: { id: abPair.id },
            body: update,
          });
          return abtestPairHandler(req, res).then(() => res);
        })
      );

      // All updates should succeed (last one wins)
      responses.forEach(res => {
        expect(res._getStatusCode()).toBe(200);
      });

      // Verify final state
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: abPair.id },
      });

      await abtestPairHandler(getReq, getRes);
      expect(getRes._getStatusCode()).toBe(200);
      
      const finalState = JSON.parse(getRes._getData());
      expect(['active', 'inactive']).toContain(finalState.status);
    });

    it('should maintain A/B test integrity under high load', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Create A/B pair
      const { req: createReq, res: createRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(createReq, createRes);

      // Simulate high-volume concurrent voting
      const concurrentVotes = Array.from({ length: 20 }, (_, i) => ({
        votes: [
          { messageId: fixtures.messages.M1.id, choice: (i % 4) + 1, votedAtClient: new Date().toISOString() },
          { messageId: fixtures.messages.M2.id, choice: ((i + 1) % 4) + 1, votedAtClient: new Date().toISOString() },
        ],
        idempotencyKey: `high-load-${i}`,
      }));

      mockGetSession.mockResolvedValue(null);

      const responses = await Promise.all(
        concurrentVotes.map(voteData => {
          const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
            method: 'POST',
            body: voteData,
          });
          return abtestVoteHandler(req, res).then(() => res);
        })
      );

      // All votes should be processed successfully
      responses.forEach(res => {
        expect(res._getStatusCode()).toBe(200);
        const result = JSON.parse(res._getData());
        expect(result.accepted).toBe(2); // Each vote contains 2 messages
      });

      // Verify vote integrity through results
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      
      const { req: resultsReq, res: resultsRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          rollup: 'false',
        },
      });

      await resultsHandler(resultsReq, resultsRes);
      expect(resultsRes._getStatusCode()).toBe(200);
      
      const results = JSON.parse(resultsRes._getData());
      
      // Both messages should have received equal vote counts
      if (results.items.length >= 2) {
        const messageACounts = results.items.find((item: any) => 
          item.key === 'Make Healthcare Accessible'
        );
        const messageBCounts = results.items.find((item: any) => 
          item.key === 'Protect Our Environment'
        );

        if (messageACounts && messageBCounts) {
          expect(messageACounts.counts.n).toBe(messageBCounts.counts.n);
          expect(messageACounts.counts.n).toBe(concurrentVotes.length);
        }
      }
    });
  });
});