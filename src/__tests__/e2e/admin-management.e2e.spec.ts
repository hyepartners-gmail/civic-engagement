/**
 * End-to-End Tests: Admin Management Interface
 * 
 * Tests complete admin workflows including message CRUD operations,
 * reordering with LexoRank, results analytics, and A/B test management.
 */

import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
import type { TestFixtures } from '../fixtures/testData';

// Import API handlers for testing
import messagesHandler from '@/pages/api/messages';
import adminMessagesHandler from '@/pages/api/admin/messages';
import adminMessageHandler from '@/pages/api/admin/messages/[id]';
import reorderHandler from '@/pages/api/admin/messages/reorder';
import resultsHandler from '@/pages/api/admin/messages/results';
import abtestPairsHandler from '@/pages/api/admin/messages/abtest/pairs';
import abtestPairHandler from '@/pages/api/admin/messages/abtest/[id]';

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

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
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
  validateMethod: jest.fn((req, res, methods) => methods.includes(req.method)),
  setStandardHeaders: jest.fn(),
}));

const mockGetSession = require('next-auth/react').getSession;

describe('E2E: Admin Management Interface', () => {
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

  describe('Complete Message Management Workflow', () => {
    it('should handle full CRUD lifecycle for messages', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Step 1: Create a new message
      const { req: createReq, res: createRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          slogan: 'Transform Our Education System',
          subline: 'Every child deserves quality education',
          status: 'active',
        },
      });

      await adminMessagesHandler(createReq, createRes);
      expect(createRes._getStatusCode()).toBe(201);
      
      const createdMessage = JSON.parse(createRes._getData());
      expect(createdMessage.slogan).toBe('Transform Our Education System');
      expect(createdMessage.status).toBe('active');
      expect(createdMessage.rank).toBeDefined();

      // Step 2: List all messages (should include new one)
      const { req: listReq, res: listRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'all' },
      });

      await messagesHandler(listReq, listRes);
      expect(listRes._getStatusCode()).toBe(200);
      
      const allMessages = JSON.parse(listRes._getData());
      expect(allMessages).toHaveLength(5); // 4 fixtures + 1 new
      const newMessage = allMessages.find((m: any) => m.id === createdMessage.id);
      expect(newMessage).toBeDefined();

      // Step 3: Update the message
      const { req: updateReq, res: updateRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: createdMessage.id },
        body: {
          slogan: 'Transform Our Education System - Updated',
          status: 'inactive',
        },
      });

      await adminMessageHandler(updateReq, updateRes);
      expect(updateRes._getStatusCode()).toBe(200);
      
      const updatedMessage = JSON.parse(updateRes._getData());
      expect(updatedMessage.slogan).toBe('Transform Our Education System - Updated');
      expect(updatedMessage.status).toBe('inactive');
      expect(updatedMessage.updatedAt).not.toBe(createdMessage.updatedAt);

      // Step 4: Verify update persisted
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'all' },
      });

      await messagesHandler(getReq, getRes);
      const messagesAfterUpdate = JSON.parse(getRes._getData());
      const verifyUpdated = messagesAfterUpdate.find((m: any) => m.id === createdMessage.id);
      expect(verifyUpdated.slogan).toBe('Transform Our Education System - Updated');
      expect(verifyUpdated.status).toBe('inactive');

      // Step 5: Delete the message
      const { req: deleteReq, res: deleteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: createdMessage.id },
      });

      await adminMessageHandler(deleteReq, deleteRes);
      expect(deleteRes._getStatusCode()).toBe(204);

      // Step 6: Verify deletion
      const { req: finalListReq, res: finalListRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'all' },
      });

      await messagesHandler(finalListReq, finalListRes);
      const finalMessages = JSON.parse(finalListRes._getData());
      expect(finalMessages).toHaveLength(4); // Back to original 4
      const deletedMessage = finalMessages.find((m: any) => m.id === createdMessage.id);
      expect(deletedMessage).toBeUndefined();
    });

    it('should handle message reordering workflow', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Step 1: Get initial message order
      const { req: initialReq, res: initialRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await messagesHandler(initialReq, initialRes);
      const initialMessages = JSON.parse(initialRes._getData());
      expect(initialMessages).toHaveLength(4);

      // Verify they are in rank order (a, b, c, d)
      const ranks = initialMessages.map((m: any) => m.rank);
      const sortedRanks = [...ranks].sort();
      expect(ranks).toEqual(sortedRanks);

      // Step 2: Move first message to last position
      const firstMessage = initialMessages[0];
      const lastMessage = initialMessages[initialMessages.length - 1];

      const { req: reorderReq, res: reorderRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          id: firstMessage.id,
          afterId: lastMessage.id, // Move after last message
        },
      });

      await reorderHandler(reorderReq, reorderRes);
      expect(reorderRes._getStatusCode()).toBe(200);
      
      const reorderResult = JSON.parse(reorderRes._getData());
      expect(reorderResult.newRank).toBeDefined();
      expect(reorderResult.newRank > lastMessage.rank).toBe(true);

      // Step 3: Verify new order
      const { req: verifyReq, res: verifyRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await messagesHandler(verifyReq, verifyRes);
      const reorderedMessages = JSON.parse(verifyRes._getData());
      
      // First message should now be last
      expect(reorderedMessages[reorderedMessages.length - 1].id).toBe(firstMessage.id);
      
      // All messages should still be in rank order
      const newRanks = reorderedMessages.map((m: any) => m.rank);
      const sortedNewRanks = [...newRanks].sort();
      expect(newRanks).toEqual(sortedNewRanks);

      // Step 4: Move message to middle position
      const targetMessage = reorderedMessages[reorderedMessages.length - 1]; // The moved message
      const middleMessage = reorderedMessages[1];

      const { req: middleReorderReq, res: middleReorderRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          id: targetMessage.id,
          beforeId: middleMessage.id, // Move before middle message
        },
      });

      await reorderHandler(middleReorderReq, middleReorderRes);
      expect(middleReorderRes._getStatusCode()).toBe(200);

      // Step 5: Verify final order
      const { req: finalReq, res: finalRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await messagesHandler(finalReq, finalRes);
      const finalMessages = JSON.parse(finalRes._getData());
      
      // Target message should now be before the middle message
      const targetIndex = finalMessages.findIndex((m: any) => m.id === targetMessage.id);
      const middleIndex = finalMessages.findIndex((m: any) => m.id === middleMessage.id);
      expect(targetIndex).toBeLessThan(middleIndex);
    });
  });

  describe('Analytics and Results Workflow', () => {
    it('should provide comprehensive results analytics', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Step 1: Generate some votes first (simulate voting activity)
      // This would normally be done through the voting API, but we'll seed the data
      await fixtures.seedVoteData();

      // Step 2: Query results with different groupings
      const groupByOptions = ['message', 'day', 'geo', 'party', 'demo'];

      for (const groupBy of groupByOptions) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          query: {
            groupBy,
            rollup: 'false',
            limit: '10',
          },
        });

        await resultsHandler(req, res);
        expect(res._getStatusCode()).toBe(200);
        
        const results = JSON.parse(res._getData());
        expect(results.items).toBeDefined();
        expect(results.total).toBeDefined();
        expect(results.filters).toBeDefined();
        
        // Verify data structure
        if (results.items.length > 0) {
          const item = results.items[0];
          expect(item.key).toBeDefined();
          expect(item.counts).toBeDefined();
          expect(item.rates).toBeDefined();
          expect(item.counts.n).toBeGreaterThanOrEqual(0);
          expect(item.rates.favorability).toBeGreaterThanOrEqual(0);
          expect(item.rates.favorability).toBeLessThanOrEqual(1);
        }
      }

      // Step 3: Test filtering capabilities
      const { req: filterReq, res: filterRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          messageId: fixtures.messages.M1.id,
          party: 'D',
          from: '2024-01-01',
          to: '2024-12-31',
        },
      });

      await resultsHandler(filterReq, filterRes);
      expect(filterRes._getStatusCode()).toBe(200);
      
      const filteredResults = JSON.parse(filterRes._getData());
      expect(filteredResults.filters).toMatchObject({
        messageId: fixtures.messages.M1.id,
        party: 'D',
        from: '2024-01-01',
        to: '2024-12-31',
      });

      // Step 4: Test rollup vs shard data consistency
      const { req: rollupReq, res: rollupRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          rollup: 'true',
        },
      });

      await resultsHandler(rollupReq, rollupRes);
      expect(rollupRes._getStatusCode()).toBe(200);
      
      const rollupResults = JSON.parse(rollupRes._getData());
      
      const { req: shardReq, res: shardRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'message',
          rollup: 'false',
        },
      });

      await resultsHandler(shardReq, shardRes);
      expect(shardRes._getStatusCode()).toBe(200);
      
      const shardResults = JSON.parse(shardRes._getData());
      
      // Both should return data (though might differ in performance)
      expect(rollupResults.items).toBeDefined();
      expect(shardResults.items).toBeDefined();
    });

    it('should handle date range filtering correctly', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Test with specific date range
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          groupBy: 'day',
          from: '2024-01-01',
          to: '2024-01-31',
        },
      });

      await resultsHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
      
      const results = JSON.parse(res._getData());
      
      // Verify date filtering is applied
      expect(results.filters.from).toBe('2024-01-01');
      expect(results.filters.to).toBe('2024-01-31');
      
      // If there are results, they should be within the date range
      results.items.forEach((item: any) => {
        if (item.key.match(/^\d{4}-\d{2}-\d{2}$/)) {
          expect(item.key >= '2024-01-01').toBe(true);
          expect(item.key <= '2024-01-31').toBe(true);
        }
      });
    });
  });

  describe('A/B Testing Management Workflow', () => {
    it('should handle complete A/B pair lifecycle', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Step 1: Create new A/B pair
      const { req: createReq, res: createRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(createReq, createRes);
      expect(createRes._getStatusCode()).toBe(201);
      
      const createdPair = JSON.parse(createRes._getData());
      expect(createdPair.a).toBe(fixtures.messages.M1.id);
      expect(createdPair.b).toBe(fixtures.messages.M2.id);
      expect(createdPair.status).toBe('active');

      // Step 2: List A/B pairs
      const { req: listReq, res: listRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'all' },
      });

      await abtestPairsHandler(listReq, listRes);
      expect(listRes._getStatusCode()).toBe(200);
      
      const pairs = JSON.parse(listRes._getData());
      expect(pairs).toHaveLength(2); // 1 fixture + 1 new
      const newPair = pairs.find((p: any) => p.id === createdPair.id);
      expect(newPair).toBeDefined();

      // Step 3: Update A/B pair
      const { req: updateReq, res: updateRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: createdPair.id },
        body: {
          status: 'inactive',
        },
      });

      await abtestPairHandler(updateReq, updateRes);
      expect(updateRes._getStatusCode()).toBe(200);
      
      const updatedPair = JSON.parse(updateRes._getData());
      expect(updatedPair.status).toBe('inactive');

      // Step 4: Get specific A/B pair
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: createdPair.id },
      });

      await abtestPairHandler(getReq, getRes);
      expect(getRes._getStatusCode()).toBe(200);
      
      const retrievedPair = JSON.parse(getRes._getData());
      expect(retrievedPair.id).toBe(createdPair.id);
      expect(retrievedPair.status).toBe('inactive');

      // Step 5: Delete A/B pair
      const { req: deleteReq, res: deleteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: createdPair.id },
      });

      await abtestPairHandler(deleteReq, deleteRes);
      expect(deleteRes._getStatusCode()).toBe(204);

      // Step 6: Verify deletion
      const { req: finalListReq, res: finalListRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'all' },
      });

      await abtestPairsHandler(finalListReq, finalListRes);
      const finalPairs = JSON.parse(finalListRes._getData());
      expect(finalPairs).toHaveLength(1); // Back to just fixture
      const deletedPair = finalPairs.find((p: any) => p.id === createdPair.id);
      expect(deletedPair).toBeUndefined();
    });

    it('should validate A/B pair constraints', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Test: Cannot create pair with same message for A and B
      const { req: invalidReq, res: invalidRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M1.id, // Same as A
          status: 'active',
        },
      });

      await abtestPairsHandler(invalidReq, invalidRes);
      expect(invalidRes._getStatusCode()).toBe(400);
      
      const error = JSON.parse(invalidRes._getData());
      expect(error.error.code).toBe('INVALID_INPUT');

      // Test: Cannot create pair with non-existent message
      const { req: notFoundReq, res: notFoundRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: 'non-existent-id',
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(notFoundReq, notFoundRes);
      expect(notFoundRes._getStatusCode()).toBe(400);
      
      const notFoundError = JSON.parse(notFoundRes._getData());
      expect(notFoundError.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should protect admin endpoints from unauthorized access', async () => {
      // Test without session
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'all' },
      });

      await resultsHandler(req, res);
      expect(res._getStatusCode()).toBe(401);
      
      const error = JSON.parse(res._getData());
      expect(error.error.code).toBe('UNAUTHORIZED');
    });

    it('should protect admin endpoints from regular users', async () => {
      // Test with regular user session
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'all' },
      });

      await resultsHandler(req, res);
      expect(res._getStatusCode()).toBe(403);
      
      const error = JSON.parse(res._getData());
      expect(error.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow admin users full access', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Test admin can access results
      const { req: resultsReq, res: resultsRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { groupBy: 'message' },
      });

      await resultsHandler(resultsReq, resultsRes);
      expect(resultsRes._getStatusCode()).toBe(200);

      // Test admin can create messages
      const { req: createReq, res: createRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          slogan: 'Admin Test Message',
          status: 'active',
        },
      });

      await adminMessagesHandler(createReq, createRes);
      expect(createRes._getStatusCode()).toBe(201);

      // Test admin can manage A/B pairs
      const { req: abReq, res: abRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await abtestPairsHandler(abReq, abRes);
      expect(abRes._getStatusCode()).toBe(200);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests gracefully', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Test malformed message creation
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          // Missing required slogan field
          status: 'active',
        },
      });

      await adminMessagesHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      
      const error = JSON.parse(res._getData());
      expect(error.error.code).toBe('INVALID_INPUT');
    });

    it('should handle non-existent resource operations', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Test updating non-existent message
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'non-existent-id' },
        body: { slogan: 'Updated' },
      });

      await adminMessageHandler(req, res);
      expect(res._getStatusCode()).toBe(404);
      
      const error = JSON.parse(res._getData());
      expect(error.error.code).toBe('NOT_FOUND');
    });

    it('should handle invalid method requests', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Test unsupported HTTP method
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT', // Not supported by this endpoint
        body: { test: 'data' },
      });

      await adminMessagesHandler(req, res);
      expect(res._getStatusCode()).toBe(405);
      
      const error = JSON.parse(res._getData());
      expect(error.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });
});