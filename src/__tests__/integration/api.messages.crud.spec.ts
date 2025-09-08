import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import messagesHandler from '@/pages/api/messages';
import createMessageHandler from '@/pages/api/admin/messages/index';
import updateMessageHandler from '@/pages/api/admin/messages/[id]';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
import type { TestFixtures } from '../fixtures/testData';

// Mock the datastore module to use our fake implementation
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

describe('API Integration Tests - Message CRUD', () => {
  let fixtures: TestFixtures;

  beforeEach(async () => {
    fixtures = await createTestFixtures();
    
    // Set the mocked datastore to our fake implementation
    const datastoreModule = require('@/lib/datastoreServer');
    datastoreModule.datastore = fixtures.datastore;
    
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await resetFixtures(fixtures);
  });

  describe('GET /api/messages', () => {
    it('should return active messages sorted by rank', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await messagesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('messages');
      expect(Array.isArray(data.messages)).toBe(true);
      
      // Should return only active messages (M1, M2, M3), not M4 (inactive)
      expect(data.messages).toHaveLength(3);
      
      // Should be sorted by rank (a < m < z)
      expect(data.messages[0].rank).toBe('a'); // M1
      expect(data.messages[1].rank).toBe('m'); // M2
      expect(data.messages[2].rank).toBe('z'); // M3
      
      // Verify message content
      expect(data.messages[0].slogan).toBe('Test Message 1');
      expect(data.messages[0].status).toBe('active');
    });

    it('should handle empty message list', async () => {
      // Clear all messages
      fixtures.datastore.clear();

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await messagesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.messages).toEqual([]);
    });

    it('should reject non-GET methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await messagesHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('POST /api/admin/messages', () => {
    it('should create message with admin auth and return 201', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          slogan: 'New Test Message',
          subline: 'A new message for testing',
          status: 'active',
        },
      });

      await createMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('message');
      expect(data.message.slogan).toBe('New Test Message');
      expect(data.message.subline).toBe('A new message for testing');
      expect(data.message.status).toBe('active');
      expect(data.message).toHaveProperty('id');
      expect(data.message).toHaveProperty('rank');
      expect(data.message).toHaveProperty('createdAt');
      expect(data.message).toHaveProperty('updatedAt');
      
      // Rank should be after the last existing rank (after 'z')
      expect(data.message.rank > 'z').toBe(true);
    });

    it('should assign rank after max existing rank', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Create first message
      const { req: req1, res: res1 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { slogan: 'First New Message', status: 'active' },
      });

      await createMessageHandler(req1, res1);
      const data1 = JSON.parse(res1._getData());
      const firstRank = data1.message.rank;

      // Create second message
      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { slogan: 'Second New Message', status: 'active' },
      });

      await createMessageHandler(req2, res2);
      const data2 = JSON.parse(res2._getData());
      const secondRank = data2.message.rank;

      // Second rank should be greater than first rank
      expect(secondRank > firstRank).toBe(true);
    });

    it('should require admin authentication', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { slogan: 'Unauthorized Message', status: 'active' },
      });

      await createMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should require authentication', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { slogan: 'Unauthenticated Message', status: 'active' },
      });

      await createMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should validate request body with Zod', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          // Missing required slogan
          status: 'invalid-status', // Invalid enum value
        },
      });

      await createMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error).toHaveProperty('details');
    });

    it('should default status to active', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          slogan: 'Message with default status',
        },
      });

      await createMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      
      const data = JSON.parse(res._getData());
      expect(data.message.status).toBe('active');
    });
  });

  describe('PATCH /api/admin/messages/[id]', () => {
    it('should update partial fields and updatedAt', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const messageId = fixtures.messages.M1.id;
      const originalUpdatedAt = fixtures.messages.M1.updatedAt;

      // Small delay to ensure updatedAt changes
      await new Promise(resolve => setTimeout(resolve, 1));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: messageId },
        headers: { 'content-type': 'application/json' },
        body: {
          slogan: 'Updated Test Message 1',
          subline: 'Updated subline',
        },
      });

      await updateMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.message.slogan).toBe('Updated Test Message 1');
      expect(data.message.subline).toBe('Updated subline');
      expect(data.message.status).toBe('active'); // Should remain unchanged
      expect(data.message.rank).toBe('a'); // Should remain unchanged
      expect(new Date(data.message.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should return 404 for non-existent message', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'non-existent-id' },
        headers: { 'content-type': 'application/json' },
        body: { slogan: 'This should fail' },
      });

      await updateMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('MESSAGE_NOT_FOUND');
    });

    it('should require admin authentication', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: fixtures.messages.M1.id },
        headers: { 'content-type': 'application/json' },
        body: { slogan: 'Unauthorized update' },
      });

      await updateMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
    });

    it('should validate partial update fields', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: fixtures.messages.M1.id },
        headers: { 'content-type': 'application/json' },
        body: {
          status: 'invalid-status',
          slogan: '', // Empty string should fail validation
        },
      });

      await updateMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/admin/messages/[id]', () => {
    it('should hard delete message', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const messageId = fixtures.messages.M2.id;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: messageId },
      });

      await updateMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);

      // Verify message is deleted by trying to fetch it
      const [deletedEntity] = await fixtures.datastore.get(
        fixtures.datastore.key(['Message', messageId])
      );
      expect(deletedEntity).toBeNull();
    });

    it('should return 404 for non-existent message', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'non-existent-id' },
      });

      await updateMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('should require admin authentication', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: fixtures.messages.M1.id },
      });

      await updateMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('Message Listing After Operations', () => {
    it('should omit deleted messages from listing', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Delete M2
      const { req: deleteReq, res: deleteRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: fixtures.messages.M2.id },
      });

      await updateMessageHandler(deleteReq, deleteRes);
      expect(deleteRes._getStatusCode()).toBe(200);

      // List messages
      const { req: listReq, res: listRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await messagesHandler(listReq, listRes);
      expect(listRes._getStatusCode()).toBe(200);

      const data = JSON.parse(listRes._getData());
      expect(data.messages).toHaveLength(2); // M1 and M3 only
      expect(data.messages.map((m: any) => m.id)).not.toContain(fixtures.messages.M2.id);
    });

    it('should show updated messages in listing', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Update M1
      const { req: updateReq, res: updateRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: fixtures.messages.M1.id },
        headers: { 'content-type': 'application/json' },
        body: { slogan: 'Updated in listing test' },
      });

      await updateMessageHandler(updateReq, updateRes);
      expect(updateRes._getStatusCode()).toBe(200);

      // List messages
      const { req: listReq, res: listRes } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await messagesHandler(listReq, listRes);
      expect(listRes._getStatusCode()).toBe(200);

      const data = JSON.parse(listRes._getData());
      const updatedMessage = data.messages.find((m: any) => m.id === fixtures.messages.M1.id);
      expect(updatedMessage.slogan).toBe('Updated in listing test');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json{',
      });

      await createMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error).toBeDefined();
    });

    it('should handle datastore errors gracefully', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      // Mock datastore to throw an error
      const originalSave = fixtures.datastore.save;
      fixtures.datastore.save = jest.fn().mockRejectedValue(new Error('Datastore connection failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { slogan: 'This should fail', status: 'active' },
      });

      await createMessageHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');

      // Restore original save function
      fixtures.datastore.save = originalSave;
    });
  });
});