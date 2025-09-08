import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import reorderHandler from '@/pages/api/admin/messages/reorder';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
import { generateRankBetween, compareRanks } from '@/lib/lexorank';
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

const mockGetSession = require('next-auth/react').getSession;

describe('API Integration Tests - Message Reordering', () => {
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

  describe('POST /api/admin/messages/reorder', () => {
    it('should move middle message between neighbors', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Move M2 (rank 'm') between M1 (rank 'a') and M3 (rank 'z')
      // This should update M2's rank to something between 'a' and 'z'
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M2.id,
          beforeId: fixtures.messages.M1.id,
          afterId: fixtures.messages.M3.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('message');
      expect(data.message.id).toBe(fixtures.messages.M2.id);
      
      // New rank should be between 'a' and 'z'
      const newRank = data.message.rank;
      expect(compareRanks(newRank, 'a')).toBe(1); // newRank > 'a'
      expect(compareRanks(newRank, 'z')).toBe(-1); // newRank < 'z'
    });

    it('should move message to top', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Move M3 (rank 'z') to the top (before M1)
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M3.id,
          beforeId: null,
          afterId: fixtures.messages.M1.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      const newRank = data.message.rank;
      
      // New rank should be less than the first old rank ('a')
      expect(compareRanks(newRank, 'a')).toBe(-1);
    });

    it('should move message to bottom', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Move M1 (rank 'a') to the bottom (after M3)
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M1.id,
          beforeId: fixtures.messages.M3.id,
          afterId: null,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      const newRank = data.message.rank;
      
      // New rank should be greater than the last old rank ('z')
      expect(compareRanks(newRank, 'z')).toBe(1);
    });

    it('should handle idempotent reordering (moving to same spot)', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Try to move M2 to where it already is (between M1 and M3)
      const originalRank = fixtures.messages.M2.rank;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M2.id,
          beforeId: fixtures.messages.M1.id,
          afterId: fixtures.messages.M3.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      // Should either keep the same rank or generate a new one in the same position
      const newRank = data.message.rank;
      expect(compareRanks(newRank, 'a')).toBe(1); // Still > 'a'
      expect(compareRanks(newRank, 'z')).toBe(-1); // Still < 'z'
    });

    it('should trigger rebalance when massive reorders make ranks too close', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Create many messages with close ranks to force rebalancing
      const closeMessages = [];
      for (let i = 0; i < 10; i++) {
        const messageId = `close-message-${i}`;
        const rank = `a${i.toString().padStart(3, '0')}`; // a000, a001, a002, etc.
        
        await fixtures.datastore.save({
          key: fixtures.datastore.key(['Message', messageId]),
          data: {
            id: messageId,
            slogan: `Close Message ${i}`,
            status: 'active',
            rank,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        
        closeMessages.push({ id: messageId, rank });
      }

      // Try to reorder multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            messageId: closeMessages[i].id,
            beforeId: i > 0 ? closeMessages[i-1].id : null,
            afterId: i < closeMessages.length - 1 ? closeMessages[i+1].id : null,
          },
        });

        await reorderHandler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }

      // Verify all messages still have unique ranks and proper order is maintained
      const allMessages = fixtures.datastore.getEntitiesByKind('Message');
      const ranks = allMessages.map(msg => msg.data.rank).sort();
      
      // All ranks should be unique
      const uniqueRanks = new Set(ranks);
      expect(uniqueRanks.size).toBe(ranks.length);
      
      // Ranks should be properly ordered
      for (let i = 0; i < ranks.length - 1; i++) {
        expect(compareRanks(ranks[i], ranks[i + 1])).toBe(-1);
      }
    });

    it('should require admin authentication', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M1.id,
          beforeId: null,
          afterId: fixtures.messages.M2.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should require authentication', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M1.id,
          beforeId: null,
          afterId: fixtures.messages.M2.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should validate malformed request body', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          // Missing messageId
          beforeId: fixtures.messages.M1.id,
          afterId: fixtures.messages.M2.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle non-existent message ID', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: 'non-existent-message-id',
          beforeId: fixtures.messages.M1.id,
          afterId: fixtures.messages.M2.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('MESSAGE_NOT_FOUND');
    });

    it('should handle non-existent beforeId reference', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M2.id,
          beforeId: 'non-existent-before-id',
          afterId: fixtures.messages.M3.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_REFERENCE');
    });

    it('should handle non-existent afterId reference', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M2.id,
          beforeId: fixtures.messages.M1.id,
          afterId: 'non-existent-after-id',
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_REFERENCE');
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should update updatedAt timestamp', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const originalUpdatedAt = fixtures.messages.M1.updatedAt;
      
      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M1.id,
          beforeId: null,
          afterId: fixtures.messages.M2.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      const newUpdatedAt = new Date(data.message.updatedAt);
      
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should maintain message content during reordering', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const originalMessage = fixtures.messages.M2;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M2.id,
          beforeId: fixtures.messages.M3.id,
          afterId: null,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      
      // Content should remain the same
      expect(data.message.slogan).toBe(originalMessage.slogan);
      expect(data.message.subline).toBe(originalMessage.subline);
      expect(data.message.status).toBe(originalMessage.status);
      expect(data.message.id).toBe(originalMessage.id);
      
      // Only rank and updatedAt should change
      expect(data.message.rank).not.toBe(originalMessage.rank);
      expect(new Date(data.message.updatedAt).getTime()).toBeGreaterThan(originalMessage.updatedAt.getTime());
    });
  });

  describe('LexoRank Integration', () => {
    it('should generate valid LexoRank between two positions', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const beforeRank = fixtures.messages.M1.rank; // 'a'
      const afterRank = fixtures.messages.M3.rank;  // 'z'

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M2.id,
          beforeId: fixtures.messages.M1.id,
          afterId: fixtures.messages.M3.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      const newRank = data.message.rank;
      
      // Verify the rank is lexicographically between the bounds
      expect(newRank > beforeRank).toBe(true);
      expect(newRank < afterRank).toBe(true);
      
      // Verify it's a valid LexoRank (base-36 characters)
      expect(newRank).toMatch(/^[0-9a-z]+$/);
    });

    it('should handle edge case ranks correctly', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Create messages with edge case ranks
      const edgeMessage1 = {
        id: 'edge-message-1',
        slogan: 'Edge Message 1',
        status: 'active',
        rank: '0', // Minimum rank
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edgeMessage2 = {
        id: 'edge-message-2',
        slogan: 'Edge Message 2',
        status: 'active',
        rank: 'zzzzz', // Very high rank
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await fixtures.datastore.save([
        { key: fixtures.datastore.key(['Message', edgeMessage1.id]), data: edgeMessage1 },
        { key: fixtures.datastore.key(['Message', edgeMessage2.id]), data: edgeMessage2 },
      ]);

      // Move M1 between these edge cases
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M1.id,
          beforeId: edgeMessage1.id,
          afterId: edgeMessage2.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      const newRank = data.message.rank;
      
      expect(newRank > '0').toBe(true);
      expect(newRank < 'zzzzz').toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle datastore transaction failures', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Mock datastore to fail transactions
      const originalTransaction = fixtures.datastore.transaction;
      fixtures.datastore.transaction = jest.fn().mockImplementation(() => {
        throw new Error('Transaction failed');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          messageId: fixtures.messages.M1.id,
          beforeId: null,
          afterId: fixtures.messages.M2.id,
        },
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');

      // Restore original transaction
      fixtures.datastore.transaction = originalTransaction;
    });

    it('should handle malformed JSON gracefully', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json{',
      });

      await reorderHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });
});