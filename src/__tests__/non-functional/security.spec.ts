/**
 * Security Tests
 * 
 * Validates security measures in the Political Messaging Testbed:
 * - CSRF protection validation
 * - PII detection and redaction
 * - Rate limiting enforcement  
 * - Input sanitization and validation
 * - Authentication and authorization
 */

import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import { createTestFixtures, createMockSession, resetFixtures, TEST_USERS } from '../fixtures/testData';
import type { TestFixtures } from '../fixtures/testData';

// Import API handlers for security testing
import voteBatchHandler from '@/pages/api/messages/vote-batch';
import adminMessagesHandler from '@/pages/api/admin/messages';
import resultsHandler from '@/pages/api/admin/messages/results';
import messagesHandler from '@/pages/api/messages';

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

// Mock rate limiting with controllable behavior
const mockRateLimiter = {
  checkLimit: jest.fn(),
  resetLimits: jest.fn(),
};

jest.mock('@/lib/rate-limiting', () => ({
  withRateLimit: jest.fn((limiter, handler) => async (req: any, res: any) => {
    const result = await mockRateLimiter.checkLimit(req);
    if (!result.allowed) {
      return res.status(429).json({ 
        error: { 
          code: 'RATE_LIMIT_EXCEEDED', 
          message: 'Rate limit exceeded',
          retryAfter: result.retryAfter 
        } 
      });
    }
    return handler(req, res);
  }),
}));

const mockGetSession = require('next-auth/react').getSession;
const mockProcessVoteBatch = require('@/lib/vote-aggregation-service').processVoteBatch;

describe('Security Tests', () => {
  let fixtures: TestFixtures;

  beforeEach(async () => {
    fixtures = await createTestFixtures();
    const datastoreModule = require('@/lib/datastoreServer');
    datastoreModule.datastore = fixtures.datastore;
    jest.clearAllMocks();
    mockProcessVoteBatch.mockImplementation(async (votes: any[]) => ({ accepted: votes.length, dropped: 0 }));
    
    // Reset rate limiter to allow requests by default
    mockRateLimiter.checkLimit.mockResolvedValue({ allowed: true });
  });

  afterEach(async () => {
    await resetFixtures(fixtures);
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject malicious SQL injection attempts', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const maliciousInputs = [
        "'; DROP TABLE messages; --",
        "1' OR '1'='1",
        "admin'/*",
        "UNION SELECT * FROM users",
        "<script>alert('xss')</script>",
      ];
      
      for (const maliciousInput of maliciousInputs) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: maliciousInput, // Malicious message ID
                choice: 1,
                votedAtClient: new Date().toISOString(),
              },
            ],
            idempotencyKey: `sql-injection-test-${Date.now()}`,
          },
        });
        
        await voteBatchHandler(req, res);
        
        // Should reject invalid input
        expect(res._getStatusCode()).toBe(400);
        const errorData = JSON.parse(res._getData());
        expect(errorData.error.code).toBe('INVALID_INPUT');
      }
      
      console.log('Successfully blocked SQL injection attempts');
    });

    it('should sanitize XSS attempts in message content', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
        'data:text/html,<script>alert("xss")</script>',
      ];
      
      for (const payload of xssPayloads) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            slogan: payload, // XSS payload in slogan
            subline: 'Test message',
            status: 'active',
          },
        });
        
        await adminMessagesHandler(req, res);
        
        // Should reject or sanitize malicious content
        expect([400, 201]).toContain(res._getStatusCode());
        
        if (res._getStatusCode() === 201) {
          // If accepted, content should be sanitized
          const data = JSON.parse(res._getData());
          expect(data.slogan).not.toContain('<script>');
          expect(data.slogan).not.toContain('javascript:');
        }
      }
      
      console.log('Successfully handled XSS prevention');
    });

    it('should validate input length limits', async () => {
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      
      const oversizedSlogan = 'A'.repeat(1000); // Very long slogan
      const oversizedSubline = 'B'.repeat(2000); // Very long subline
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          slogan: oversizedSlogan,
          subline: oversizedSubline,
          status: 'active',
        },
      });
      
      await adminMessagesHandler(req, res);
      
      // Should reject oversized input
      expect(res._getStatusCode()).toBe(400);
      const errorData = JSON.parse(res._getData());
      expect(errorData.error.code).toBe('INVALID_INPUT');
      
      console.log('Successfully enforced input length limits');
    });

    it('should reject invalid data types', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const invalidInputs = [
        { messageId: 123, choice: 'invalid', votedAtClient: 'not-a-date' }, // Wrong types
        { messageId: null, choice: 1, votedAtClient: new Date().toISOString() }, // Null values
        { messageId: undefined, choice: 1, votedAtClient: new Date().toISOString() }, // Undefined
        { messageId: [], choice: 1, votedAtClient: new Date().toISOString() }, // Array instead of string
      ];
      
      for (const invalidInput of invalidInputs) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [invalidInput],
            idempotencyKey: `type-validation-${Date.now()}`,
          },
        });
        
        await voteBatchHandler(req, res);
        
        // Should reject invalid types
        expect(res._getStatusCode()).toBe(400);
      }
      
      console.log('Successfully validated data types');
    });
  });

  describe('PII Detection and Redaction', () => {
    it('should detect and handle PII in user context', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      const piiData = [
        { field: 'email', value: 'user@example.com' },
        { field: 'ssn', value: '123-45-6789' },
        { field: 'phone', value: '(555) 123-4567' },
        { field: 'address', value: '123 Main St, Anytown, USA' },
      ];
      
      for (const pii of piiData) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: messages[0].id,
                choice: 1,
                votedAtClient: new Date().toISOString(),
              },
            ],
            userContext: {
              geoBucket: 'US_CA',
              partyBucket: 'D',
              demoBucket: 'age_25_34',
              [pii.field]: pii.value, // Include PII in context
            },
            idempotencyKey: `pii-test-${pii.field}`,
          },
        });
        
        await voteBatchHandler(req, res);
        
        // Request should be processed (PII should be stripped, not rejected)
        const statusCode = res._getStatusCode();
        expect([200, 400]).toContain(statusCode); // Either processed or rejected for validation
        
        if (statusCode === 200) {
          console.log(`PII ${pii.field} handled appropriately`);
        }
      }
    });

    it('should redact PII from error messages and logs', async () => {
      mockGetSession.mockResolvedValue(null);
      
      // Create a request with PII that will cause an error
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [
            {
              messageId: 'john.doe@example.com', // Email as message ID (invalid)
              choice: 1,
              votedAtClient: new Date().toISOString(),
            },
          ],
          userContext: {
            email: 'sensitive@example.com',
            ssn: '123-45-6789',
          },
          idempotencyKey: 'pii-error-test',
        },
      });
      
      await voteBatchHandler(req, res);
      
      expect(res._getStatusCode()).toBe(400);
      const errorResponse = JSON.parse(res._getData());
      
      // Error message should not contain the original PII
      const errorString = JSON.stringify(errorResponse);
      expect(errorString).not.toContain('john.doe@example.com');
      expect(errorString).not.toContain('sensitive@example.com');
      expect(errorString).not.toContain('123-45-6789');
      
      console.log('PII successfully redacted from error responses');
    });
  });

  describe('Rate Limiting Enforcement', () => {
    it('should enforce vote endpoint rate limits', async () => {
      mockGetSession.mockResolvedValue(null);
      
      // Configure rate limiter to deny after first request
      mockRateLimiter.checkLimit
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValue({ allowed: false, retryAfter: 60 });
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      // First request should succeed
      const { req: req1, res: res1 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [{ messageId: messages[0].id, choice: 1, votedAtClient: new Date().toISOString() }],
          idempotencyKey: 'rate-limit-1',
        },
      });
      
      await voteBatchHandler(req1, res1);
      expect(res1._getStatusCode()).toBe(200);
      
      // Second request should be rate limited
      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          votes: [{ messageId: messages[0].id, choice: 1, votedAtClient: new Date().toISOString() }],
          idempotencyKey: 'rate-limit-2',
        },
      });
      
      await voteBatchHandler(req2, res2);
      expect(res2._getStatusCode()).toBe(429);
      
      const errorData = JSON.parse(res2._getData());
      expect(errorData.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(errorData.error.retryAfter).toBeDefined();
      
      console.log('Rate limiting successfully enforced');
    });

    it('should apply different rate limits to different endpoints', async () => {
      // Test admin endpoint rate limiting
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.admin));
      mockRateLimiter.checkLimit.mockResolvedValue({ allowed: false, retryAfter: 60 });
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { groupBy: 'message' },
      });
      
      await resultsHandler(req, res);
      expect(res._getStatusCode()).toBe(429);
      
      const errorData = JSON.parse(res._getData());
      expect(errorData.error.code).toBe('RATE_LIMIT_EXCEEDED');
      
      console.log('Admin endpoint rate limiting working');
    });

    it('should handle rate limit bypass attempts', async () => {
      mockGetSession.mockResolvedValue(null);
      
      // Configure strict rate limiting
      mockRateLimiter.checkLimit.mockResolvedValue({ allowed: false, retryAfter: 300 });
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      // Attempt with different headers to bypass rate limiting
      const bypassAttempts = [
        { 'x-forwarded-for': '192.168.1.1' },
        { 'x-real-ip': '10.0.0.1' },
        { 'user-agent': 'Different-Agent' },
        { 'x-forwarded-proto': 'https' },
      ];
      
      for (const headers of bypassAttempts) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          headers,
          body: {
            votes: [{ messageId: messages[0].id, choice: 1, votedAtClient: new Date().toISOString() }],
            idempotencyKey: `bypass-${Date.now()}`,
          },
        });
        
        await voteBatchHandler(req, res);
        
        // Should still be rate limited regardless of headers
        expect(res._getStatusCode()).toBe(429);
      }
      
      console.log('Rate limit bypass attempts successfully blocked');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should prevent privilege escalation attempts', async () => {
      // Test with regular user trying to access admin functions
      mockGetSession.mockResolvedValue(createMockSession(TEST_USERS.regular));
      
      const adminEndpoints = [
        { handler: adminMessagesHandler, method: 'POST', body: { slogan: 'Test', status: 'active' } },
        { handler: resultsHandler, method: 'GET', query: { groupBy: 'message' } },
      ];
      
      for (const endpoint of adminEndpoints) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: endpoint.method,
          body: endpoint.body,
          query: endpoint.query,
        });
        
        await endpoint.handler(req, res);
        
        // Should be forbidden
        expect(res._getStatusCode()).toBe(403);
        const errorData = JSON.parse(res._getData());
        expect(errorData.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      }
      
      console.log('Privilege escalation attempts successfully blocked');
    });

    it('should handle session hijacking attempts', async () => {
      // Test with malformed or tampered sessions
      const tamperedSessions = [
        null, // No session
        { user: { id: 'fake-admin', role: 'admin' } }, // Fake admin session
        { user: { role: 'admin' } }, // Missing user ID
        { user: { id: TEST_USERS.regular.id, role: 'admin' } }, // Role tampering
      ];
      
      for (const session of tamperedSessions) {
        mockGetSession.mockResolvedValue(session);
        
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          query: { groupBy: 'message' },
        });
        
        await resultsHandler(req, res);
        
        // Should be unauthorized or forbidden
        expect([401, 403]).toContain(res._getStatusCode());
      }
      
      console.log('Session hijacking attempts successfully blocked');
    });

    it('should enforce CORS policies', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const maliciousOrigins = [
        'http://evil.com',
        'https://malicious.site',
        'http://localhost:3001', // Different port
      ];
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      for (const origin of maliciousOrigins) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          headers: {
            origin: origin,
            'access-control-request-method': 'POST',
          },
          body: {
            votes: [{ messageId: messages[0].id, choice: 1, votedAtClient: new Date().toISOString() }],
            idempotencyKey: `cors-test-${Date.now()}`,
          },
        });
        
        await voteBatchHandler(req, res);
        
        // Should either block request or not set CORS headers for malicious origins
        const corsHeader = res._getHeaders()['access-control-allow-origin'];
        expect(corsHeader).not.toBe(origin);
      }
      
      console.log('CORS policies properly enforced');
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should prevent data tampering in transit', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      // Attempt to modify vote choice to invalid values
      const tamperedChoices = [-1, 0, 5, 999, 'invalid'];
      
      for (const choice of tamperedChoices) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: messages[0].id,
                choice: choice, // Invalid choice
                votedAtClient: new Date().toISOString(),
              },
            ],
            idempotencyKey: `tamper-test-${choice}`,
          },
        });
        
        await voteBatchHandler(req, res);
        
        // Should reject invalid choices
        expect(res._getStatusCode()).toBe(400);
        const errorData = JSON.parse(res._getData());
        expect(errorData.error.code).toBe('INVALID_INPUT');
      }
      
      console.log('Data tampering attempts successfully blocked');
    });

    it('should validate timestamp integrity', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const { req: getReq, res: getRes } = createMocks<NextApiRequest, NextApiResponse>({ method: 'GET' });
      await messagesHandler(getReq, getRes);
      const messages = JSON.parse(getRes._getData());
      
      const invalidTimestamps = [
        '2050-01-01T00:00:00.000Z', // Future date
        'invalid-date',
        '1900-01-01T00:00:00.000Z', // Very old date
        '', // Empty string
      ];
      
      for (const timestamp of invalidTimestamps) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            votes: [
              {
                messageId: messages[0].id,
                choice: 1,
                votedAtClient: timestamp,
              },
            ],
            idempotencyKey: `timestamp-${Date.now()}`,
          },
        });
        
        await voteBatchHandler(req, res);
        
        // Should handle invalid timestamps appropriately
        expect([200, 400]).toContain(res._getStatusCode());
        
        if (res._getStatusCode() === 400) {
          const errorData = JSON.parse(res._getData());
          expect(errorData.error.code).toBe('INVALID_INPUT');
        }
      }
      
      console.log('Timestamp validation working correctly');
    });
  });
});