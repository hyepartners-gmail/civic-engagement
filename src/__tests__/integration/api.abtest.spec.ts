import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import abtestPairsHandler from '@/pages/api/admin/messages/abtest/pairs';
import abtestPairHandler from '@/pages/api/admin/messages/abtest/[id]';
import abtestVoteHandler from '@/pages/api/messages/abtest/vote-batch';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
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

// Mock NextAuth core modules
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock vote aggregation service
jest.mock('@/lib/vote-aggregation-service', () => ({
  processVoteBatch: jest.fn(),
}));

// Mock rate limiting
jest.mock('@/lib/rate-limiting', () => ({
  withRateLimit: jest.fn((limiter, handler) => handler),
  voteRateLimiter: {},
}));

// Mock bucket derivation
jest.mock('@/lib/bucket-derivation', () => ({
  deriveAllBuckets: jest.fn(() => ({
    geoBucket: 'US_CA',
    partyBucket: 'D',
    demoBucket: 'age_25_34',
  })),
}));

// Mock messaging datastore functions
jest.mock('@/lib/messaging-datastore', () => ({
  getABPairs: jest.fn(),
  createABPair: jest.fn(),
  updateABPair: jest.fn(),
  deleteABPair: jest.fn(),
  getMessage: jest.fn(),
}));

// Mock admin auth middleware
jest.mock('@/lib/admin-auth-middleware', () => ({
  withAdminAuth: jest.fn((handler) => async (req: any, res: any) => {
    // Add user to request if session exists
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
const mockProcessVoteBatch = require('@/lib/vote-aggregation-service').processVoteBatch;
const mockGetABPairs = require('@/lib/messaging-datastore').getABPairs;
const mockCreateABPair = require('@/lib/messaging-datastore').createABPair;
const mockUpdateABPair = require('@/lib/messaging-datastore').updateABPair;
const mockDeleteABPair = require('@/lib/messaging-datastore').deleteABPair;
const mockGetMessage = require('@/lib/messaging-datastore').getMessage;

describe('API Integration Tests - A/B Testing', () => {
  let fixtures: TestFixtures;

  beforeEach(async () => {
    fixtures = await createTestFixtures();
    
    // Set the mocked datastore
    const datastoreModule = require('@/lib/datastoreServer');
    datastoreModule.datastore = fixtures.datastore;
    
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockGetABPairs.mockImplementation(async (status?: string) => {
      if (status && status !== 'active') return [];
      return [fixtures.abPairs.AB1];
    });
    
    mockCreateABPair.mockImplementation(async (a: string, b: string, status: string) => ({
      id: 'new-abpair-id',
      a,
      b,
      status,
      rank: 'z',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    mockUpdateABPair.mockImplementation(async (id: string, updates: any) => {
      if (id === fixtures.abPairs.AB1.id) {
        return { ...fixtures.abPairs.AB1, ...updates, updatedAt: new Date() };
      }
      return null;
    });
    
    mockDeleteABPair.mockImplementation(async (id: string) => {
      return id === fixtures.abPairs.AB1.id;
    });
    
    mockGetMessage.mockImplementation(async (id: string) => {
      return Object.values(fixtures.messages).find(msg => msg.id === id) || null;
    });
  });

  afterEach(async () => {
    await resetFixtures(fixtures);
  });

  describe('GET /api/admin/messages/abtest/pairs', () => {
    it('should fetch all A/B pairs for admin', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1); // One test AB pair from fixtures
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('a');
      expect(data[0]).toHaveProperty('b');
      expect(data[0]).toHaveProperty('status');
    });

    it('should filter A/B pairs by status', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { status: 'active' },
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(Array.isArray(data)).toBe(true);
      data.forEach((pair: any) => {
        expect(pair.status).toBe('active');
      });
    });

    it('should require admin authentication', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should require authentication', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('POST /api/admin/messages/abtest/pairs', () => {
    it('should create a new A/B pair', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('id');
      expect(data.a).toBe(fixtures.messages.M1.id);
      expect(data.b).toBe(fixtures.messages.M2.id);
      expect(data.status).toBe('active');
    });

    it('should validate that both messages exist', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: '550e8400-e29b-41d4-a716-446655440998', // non-existent but valid UUID
          b: fixtures.messages.M2.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('Message A not found');
    });

    it('should validate that A and B are different', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M1.id,
          status: 'active',
        },
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_INPUT');
      expect(data.error.message).toContain('must be different');
    });

    it('should validate request body', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          a: 'invalid-uuid',
          b: fixtures.messages.M2.id,
          status: 'invalid-status',
        },
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('PUT /api/admin/messages/abtest/pairs (batch update)', () => {
    it('should update multiple A/B pairs', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        body: {
          pairs: [
            {
              id: fixtures.abPairs.AB1.id,
              a: fixtures.abPairs.AB1.a,
              b: fixtures.abPairs.AB1.b,
              status: 'inactive',
              rank: fixtures.abPairs.AB1.rank,
            },
          ],
        },
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.updated).toBe(1);
      expect(data.pairs[0].status).toBe('inactive');
    });

    it('should handle partial failures gracefully', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        body: {
          pairs: [
            {
              id: '550e8400-e29b-41d4-a716-446655440999',
              a: '550e8400-e29b-41d4-a716-446655440001',
              b: '550e8400-e29b-41d4-a716-446655440002',
              status: 'inactive',
              rank: 'z',
            },
          ],
        },
      });

      await abtestPairsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('PARTIAL_FAILURE');
    });
  });

  describe('GET /api/admin/messages/abtest/[id]', () => {
    it('should fetch specific A/B pair', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: fixtures.abPairs.AB1.id },
      });

      await abtestPairHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.id).toBe(fixtures.abPairs.AB1.id);
      expect(data.a).toBe(fixtures.messages.M1.id);
      expect(data.b).toBe(fixtures.messages.M2.id);
    });

    it('should return 404 for non-existent pair', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: '550e8400-e29b-41d4-a716-446655440999' },
      });

      await abtestPairHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should validate UUID format', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'invalid-uuid' },
      });

      await abtestPairHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_PARAMS');
    });
  });

  describe('PATCH /api/admin/messages/abtest/[id]', () => {
    it('should update specific A/B pair', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: fixtures.abPairs.AB1.id },
        body: {
          status: 'inactive',
        },
      });

      await abtestPairHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.status).toBe('inactive');
    });

    it('should validate that A and B are different when updating both', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: fixtures.abPairs.AB1.id },
        body: {
          a: fixtures.messages.M1.id,
          b: fixtures.messages.M1.id,
        },
      });

      await abtestPairHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('should require at least one field for update', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: fixtures.abPairs.AB1.id },
        body: {},
      });

      await abtestPairHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('DELETE /api/admin/messages/abtest/[id]', () => {
    it('should delete specific A/B pair', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: fixtures.abPairs.AB1.id },
      });

      await abtestPairHandler(req, res);

      expect(res._getStatusCode()).toBe(204);
      expect(res._getData()).toBe('');
    });
  });

  describe('POST /api/messages/abtest/vote-batch', () => {
    beforeEach(() => {
      mockProcessVoteBatch.mockResolvedValue({
        accepted: 2,
        dropped: 0,
      });
    });

    it('should process A/B test votes with two messages', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: fixtures.messages.M1.id,
              choice: 1, // love
              votedAtClient: new Date().toISOString(),
            },
            {
              messageId: fixtures.messages.M2.id,
              choice: 2, // like
              votedAtClient: new Date().toISOString(),
            },
          ],
          userContext: {
            geoBucket: 'US_CA',
            partyBucket: 'D',
            demoBucket: 'age_25_34',
          },
          idempotencyKey: '550e8400-e29b-41d4-a716-446655440123',
        },
      });

      await abtestVoteHandler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.accepted).toBe(2);
      expect(data.dropped).toBe(0);
      
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            messageId: fixtures.messages.M1.id,
            choice: 1, // love
          }),
          expect.objectContaining({
            messageId: fixtures.messages.M2.id,
            choice: 2, // like
          }),
        ]),
        expect.objectContaining({
          geoBucket: 'US_CA',
          partyBucket: 'D',
          demoBucket: 'age_25_34',
        }),
        TEST_USERS.regular.id,
        expect.any(String)
      );
    });

    it('should work for anonymous users', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: fixtures.messages.M1.id,
              choice: 1, // love
              votedAtClient: new Date().toISOString(),
            },
          ],
          idempotencyKey: '550e8400-e29b-41d4-a716-446655440124',
        },
      });

      await abtestVoteHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.accepted).toBe(2);
      expect(data.dropped).toBe(0);
      
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        expect.any(Array),
        {},
        undefined,
        'test-uuid-1234'
      );
      
      // Check that anonymous session cookie is set
      const cookieHeaders = res._getHeaders()['set-cookie'];
      expect(cookieHeaders).toBeDefined();
      expect(cookieHeaders[0]).toContain('anon-session-id=test-uuid-1234');
    });

    it('should derive user context from session if not provided', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: fixtures.messages.M1.id,
              choice: 1, // love
              votedAtClient: new Date().toISOString(),
            },
          ],
          idempotencyKey: '550e8400-e29b-41d4-a716-446655440125',
        },
      });

      await abtestVoteHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          geoBucket: 'US_CA',
          partyBucket: 'D',
          demoBucket: 'age_25_34',
        }),
        TEST_USERS.regular.id,
        expect.any(String)
      );
    });

    it('should validate vote batch data', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: 'invalid-uuid',
              choice: 5, // invalid choice
              votedAtClient: 'invalid-date',
            },
          ],
        },
      });

      await abtestVoteHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('should ignore invalid user context gracefully', async () => {
      mockGetSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: fixtures.messages.M1.id,
              choice: 1, // love
              votedAtClient: new Date().toISOString(),
            },
          ],
          userContext: {
            invalidField: 'invalid-value',
          },
          idempotencyKey: '550e8400-e29b-41d4-a716-446655440126',
        },
      });

      await abtestVoteHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      expect(mockProcessVoteBatch).toHaveBeenCalledWith(
        expect.any(Array),
        {}, // Should fallback to empty context
        undefined,
        'test-uuid-1234'
      );
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await abtestVoteHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should handle OPTIONS for CORS', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'OPTIONS',
      });

      await abtestVoteHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getData()).toBe('');
    });

    it('should handle vote processing errors', async () => {
      mockGetSession.mockResolvedValue(null);
      mockProcessVoteBatch.mockRejectedValue(new Error('Vote processing failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: fixtures.messages.M1.id,
              choice: 1, // love
              votedAtClient: new Date().toISOString(),
            },
          ],
          idempotencyKey: '550e8400-e29b-41d4-a716-446655440127',
        },
      });

      await abtestVoteHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      
      const data = JSON.parse(res._getData());
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});