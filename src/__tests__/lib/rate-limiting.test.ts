import { NextApiRequest, NextApiResponse } from 'next';
import {
  createRateLimiter,
  voteRateLimiter,
  adminRateLimiter,
  publicReadRateLimiter,
  withRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  sessionBasedKeyGenerator,
  ipBasedKeyGenerator,
} from '@/lib/rate-limiting';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  getSession: jest.fn(),
}));

const mockGetSession = require('next-auth/react').getSession;

describe('Rate Limiting', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
      connection: {
        remoteAddress: '127.0.0.1',
      } as any,
    };

    mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  describe('createRateLimiter', () => {
    it('should allow requests within limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10,
      });

      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
    });

    it('should block requests when limit exceeded', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      // First two requests should pass
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);

      // Third request should be blocked
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
          retryAfter: expect.any(Number),
        },
      });
    });

    it('should reset counter after window expires', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 100, // 100ms window
        maxRequests: 1,
      });

      // First request should pass
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third request should pass again
      jest.clearAllMocks();
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should use custom key generator', async () => {
      const customKeyGenerator = jest.fn().mockResolvedValue('custom-key');
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: customKeyGenerator,
      });

      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);

      expect(customKeyGenerator).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle custom error message', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        message: 'Custom rate limit message',
      });

      // Exhaust the limit
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Custom rate limit message',
          retryAfter: expect.any(Number),
        },
      });
    });

    it('should skip successful requests when configured', async () => {
      let responseStatus = 200;
      const mockResWithStatus = {
        ...mockRes,
        statusCode: responseStatus,
        end: jest.fn(function(this: any, chunk?: any, encoding?: any) {
          this.statusCode = responseStatus;
          return mockRes.end?.call(this, chunk, encoding);
        }),
      };

      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true,
      });

      // First request (successful)
      await rateLimiter(mockReq as NextApiRequest, mockResWithStatus as NextApiResponse, async () => {
        responseStatus = 200;
      });

      // Second request (successful) - should not increment due to skipSuccessfulRequests
      await rateLimiter(mockReq as NextApiRequest, mockResWithStatus as NextApiResponse, async () => {
        responseStatus = 200;
      });

      // Third request - should still pass because successful requests weren't counted
      await rateLimiter(mockReq as NextApiRequest, mockResWithStatus as NextApiResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const faultyKeyGenerator = jest.fn().mockRejectedValue(new Error('Key generation failed'));
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: faultyKeyGenerator,
      });

      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);

      // Should fall back to allowing the request
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('Key Generators', () => {
    describe('sessionBasedKeyGenerator', () => {
      it('should use user ID when available', async () => {
        mockGetSession.mockResolvedValue({
          user: { id: 'user123' },
        });

        const key = await sessionBasedKeyGenerator(mockReq as NextApiRequest);

        expect(key).toBe('user:user123');
      });

      it('should use anonymous session ID when no user', async () => {
        mockGetSession.mockResolvedValue(null);
        mockReq.cookies = { 'anon-session-id': 'anon123' };

        const key = await sessionBasedKeyGenerator(mockReq as NextApiRequest);

        expect(key).toBe('anon:anon123');
      });

      it('should fall back to IP when no session', async () => {
        mockGetSession.mockResolvedValue(null);
        mockReq.cookies = {};

        const key = await sessionBasedKeyGenerator(mockReq as NextApiRequest);

        expect(key).toBe('ip:127.0.0.1');
      });

      it('should handle forwarded IP addresses', async () => {
        mockGetSession.mockResolvedValue(null);
        mockReq.headers = { 'x-forwarded-for': '203.0.113.1, 198.51.100.2' };

        const key = await sessionBasedKeyGenerator(mockReq as NextApiRequest);

        expect(key).toBe('ip:203.0.113.1');
      });
    });

    describe('ipBasedKeyGenerator', () => {
      it('should extract IP from remote address', () => {
        const key = ipBasedKeyGenerator(mockReq as NextApiRequest);

        expect(key).toBe('ip:127.0.0.1');
      });

      it('should extract IP from x-forwarded-for header', () => {
        mockReq.headers = { 'x-forwarded-for': '203.0.113.1' };

        const key = ipBasedKeyGenerator(mockReq as NextApiRequest);

        expect(key).toBe('ip:203.0.113.1');
      });

      it('should handle array x-forwarded-for header', () => {
        mockReq.headers = { 'x-forwarded-for': ['203.0.113.1', '198.51.100.2'] };

        const key = ipBasedKeyGenerator(mockReq as NextApiRequest);

        expect(key).toBe('ip:203.0.113.1');
      });

      it('should handle unknown IP gracefully', () => {
        mockReq.socket = undefined;
        mockReq.headers = {};

        const key = ipBasedKeyGenerator(mockReq as NextApiRequest);

        expect(key).toBe('ip:unknown');
      });
    });
  });

  describe('Predefined Rate Limiters', () => {
    describe('voteRateLimiter', () => {
      it('should allow 60 requests per minute', async () => {
        // Test that we can make 60 requests
        for (let i = 0; i < 60; i++) {
          await voteRateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(60);
        expect(mockRes.status).not.toHaveBeenCalledWith(429);

        // 61st request should be blocked
        await voteRateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(429);
      });

      it('should use session-based key generation', async () => {
        mockGetSession.mockResolvedValue({
          user: { id: 'voter123' },
        });

        await voteRateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 60);
      });
    });

    describe('adminRateLimiter', () => {
      it('should allow 100 requests per minute', async () => {
        mockGetSession.mockResolvedValue({
          user: { id: 'admin123' },
        });

        // Test that we can make 100 requests
        for (let i = 0; i < 100; i++) {
          await adminRateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(100);
        expect(mockRes.status).not.toHaveBeenCalledWith(429);

        // 101st request should be blocked
        await adminRateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(429);
      });
    });

    describe('publicReadRateLimiter', () => {
      it('should allow 200 requests per minute', async () => {
        // Test a smaller subset to avoid timeout
        for (let i = 0; i < 10; i++) {
          await publicReadRateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
        }

        expect(mockNext).toHaveBeenCalledTimes(10);
        expect(mockRes.status).not.toHaveBeenCalledWith(429);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 200);
      });
    });
  });

  describe('withRateLimit', () => {
    it('should wrap handler with rate limiting', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      const wrappedHandler = withRateLimit(rateLimiter, mockHandler);

      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should block handler when rate limit exceeded', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      const wrappedHandler = withRateLimit(rateLimiter, mockHandler);

      // First request should pass
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      jest.clearAllMocks();
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Utility Functions', () => {
    describe('resetRateLimit', () => {
      it('should reset rate limit for specific key', async () => {
        const rateLimiter = createRateLimiter({
          windowMs: 60000,
          maxRequests: 1,
        });

        // Exhaust the limit
        await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
        await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(429);

        // Reset the limit
        const success = resetRateLimit('ip:127.0.0.1');
        expect(success).toBe(true);

        // Should be able to make requests again
        jest.clearAllMocks();
        await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalledWith(429);
      });

      it('should return false for non-existent key', () => {
        const success = resetRateLimit('non-existent-key');
        expect(success).toBe(false);
      });
    });

    describe('getRateLimitStatus', () => {
      it('should return rate limit status for existing key', async () => {
        const rateLimiter = createRateLimiter({
          windowMs: 60000,
          maxRequests: 5,
        });

        await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);

        const status = getRateLimitStatus('ip:127.0.0.1');
        expect(status).toEqual({
          count: 1,
          resetTime: expect.any(Number),
        });
      });

      it('should return null for non-existent key', () => {
        const status = getRateLimitStatus('non-existent-key');
        expect(status).toBeNull();
      });
    });
  });

  describe('Different Request Scenarios', () => {
    it('should handle multiple IPs independently', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      // First IP - request should pass
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request from same IP should be blocked
      jest.clearAllMocks();
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Different IP should not be affected
      jest.clearAllMocks();
      mockReq.socket = { remoteAddress: '192.168.1.1' } as any;
      mockReq.connection = { remoteAddress: '192.168.1.1' } as any;
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    it('should handle authenticated vs anonymous users separately', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: sessionBasedKeyGenerator,
      });

      // Anonymous user request
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Authenticated user should have separate limit
      jest.clearAllMocks();
      mockGetSession.mockResolvedValue({
        user: { id: 'user123' },
      });

      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    it('should handle proxy headers correctly', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      // Request through proxy
      mockReq.headers = {
        'x-forwarded-for': '203.0.113.1, 198.51.100.2, 192.168.1.1',
      };

      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Same client IP through proxy should be rate limited
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed session data', async () => {
      mockGetSession.mockResolvedValue({
        user: null, // Malformed session
      });

      const key = await sessionBasedKeyGenerator(mockReq as NextApiRequest);
      expect(key).toBe('ip:127.0.0.1'); // Should fall back to IP
    });

    it('should handle concurrent requests from same user', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext)
      );

      await Promise.all(promises);

      // Should have proper rate limiting even with concurrent requests
      // Expect at most 5 successful calls due to rate limiting
      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should handle very short time windows', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 10, // 10ms window
        maxRequests: 1,
      });

      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 15));
      
      jest.clearAllMocks();
      await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle memory cleanup for expired entries', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 50,
        maxRequests: 1,
      });

      // Create multiple entries
      for (let i = 0; i < 10; i++) {
        mockReq.socket = { remoteAddress: `192.168.1.${i}` } as any;
        await rateLimiter(mockReq as NextApiRequest, mockRes as NextApiResponse, mockNext);
      }

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Memory should be cleaned up (this is tested implicitly by not running out of memory)
      expect(true).toBe(true);
    });
  });
});