import { NextApiRequest, NextApiResponse } from 'next';
import {
  setCorsHeaders,
  handleCorsOptions,
  setCSRFToken,
  validateCSRF,
  setSecurityHeaders,
  sanitizeInput,
  sanitizeObject,
  detectPII,
  redactPII,
  createAuditLog,
  getClientIP,
  withSecurity,
} from '@/lib/security';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  getSession: jest.fn(),
}));

const mockGetSession = require('next-auth/react').getSession;

describe('Security Utilities', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      headers: {},
      cookies: {},
      url: '/api/test',
    };

    mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('CORS Headers', () => {
    describe('setCorsHeaders', () => {
      it('should set CORS headers for allowed origin', () => {
        mockReq.headers = { origin: 'http://localhost:3000' };

        setCorsHeaders(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.any(String));
        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', expect.any(String));
        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      });

      it('should not set origin header for disallowed origin', () => {
        mockReq.headers = { origin: 'https://malicious-site.com' };

        setCorsHeaders(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://malicious-site.com');
      });

      it('should handle requests without origin in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        mockReq.headers = {};

        setCorsHeaders(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');

        process.env.NODE_ENV = originalEnv;
      });

      it('should apply custom CORS configuration', () => {
        const customConfig = {
          allowedOrigins: ['https://custom-domain.com'],
          allowedMethods: ['GET', 'POST'],
          credentials: false,
        };

        mockReq.headers = { origin: 'https://custom-domain.com' };

        setCorsHeaders(mockReq as NextApiRequest, mockRes as NextApiResponse, customConfig);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://custom-domain.com');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST');
        expect(mockRes.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      });
    });

    describe('handleCorsOptions', () => {
      it('should handle OPTIONS request', () => {
        mockReq.method = 'OPTIONS';

        const result = handleCorsOptions(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(result).toBe(true);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.end).toHaveBeenCalled();
      });

      it('should not handle non-OPTIONS request', () => {
        mockReq.method = 'GET';

        const result = handleCorsOptions(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(result).toBe(false);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.end).not.toHaveBeenCalled();
      });
    });
  });

  describe('CSRF Protection', () => {
    describe('setCSRFToken', () => {
      it('should set CSRF token cookie for authenticated user', async () => {
        mockGetSession.mockResolvedValue({
          user: { id: 'user123', email: 'test@example.com' },
        });

        await setCSRFToken(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Set-Cookie',
          expect.stringContaining('__csrf-token=')
        );
      });

      it('should set CSRF token cookie for anonymous user', async () => {
        mockGetSession.mockResolvedValue(null);
        mockReq.cookies = { 'anon-session-id': 'anon123' };

        await setCSRFToken(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Set-Cookie',
          expect.stringContaining('__csrf-token=')
        );
      });
    });

    describe('validateCSRF', () => {
      it('should skip validation for GET requests', async () => {
        mockReq.method = 'GET';

        const result = await validateCSRF(mockReq as NextApiRequest);

        expect(result).toBe(true);
      });

      it('should skip validation in development environment', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        mockReq.method = 'POST';

        const result = await validateCSRF(mockReq as NextApiRequest);

        expect(result).toBe(true);

        process.env.NODE_ENV = originalEnv;
      });

      it('should return false when no token provided', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        mockReq.method = 'POST';
        mockReq.headers = {};
        mockReq.cookies = {};

        const result = await validateCSRF(mockReq as NextApiRequest);

        expect(result).toBe(false);

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('Security Headers', () => {
    describe('setSecurityHeaders', () => {
      it('should set all security headers', () => {
        setSecurityHeaders(mockRes as NextApiResponse);

        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
        expect(mockRes.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Permissions-Policy', expect.any(String));
      });

      it('should set HSTS header in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        setSecurityHeaders(mockRes as NextApiResponse);

        expect(mockRes.setHeader).toHaveBeenCalledWith(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload'
        );

        process.env.NODE_ENV = originalEnv;
      });

      it('should not set HSTS header in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        setSecurityHeaders(mockRes as NextApiResponse);

        expect(mockRes.setHeader).not.toHaveBeenCalledWith(
          'Strict-Transport-Security',
          expect.any(String)
        );

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('Input Sanitization', () => {
    describe('sanitizeInput', () => {
      it('should remove dangerous characters', () => {
        const input = '<script>alert("xss")</script>';
        const result = sanitizeInput(input);
        
        expect(result).toBe('scriptalert(xss)/script');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).not.toContain('"');
        expect(result).not.toContain("'");
      });

      it('should trim whitespace', () => {
        const input = '  test input  ';
        const result = sanitizeInput(input);
        
        expect(result).toBe('test input');
      });

      it('should limit length', () => {
        const input = 'a'.repeat(1500);
        const result = sanitizeInput(input);
        
        expect(result.length).toBe(1000);
      });

      it('should handle empty string', () => {
        const result = sanitizeInput('');
        expect(result).toBe('');
      });

      it('should preserve safe characters', () => {
        const input = 'Hello world! 123 @#$%^&*()_+-=[]{}|;:,./? ';
        const result = sanitizeInput(input);
        
        expect(result).toBe('Hello world! 123 @#$%^&*()_+-=[]{}|;:,./?');
      });
    });

    describe('sanitizeObject', () => {
      it('should sanitize string values in object', () => {
        const input = {
          name: '<script>alert("xss")</script>',
          description: 'Safe text',
          count: 42,
        };

        const result = sanitizeObject(input);

        expect(result.name).toBe('scriptalert(xss)/script');
        expect(result.description).toBe('Safe text');
        expect(result.count).toBe(42);
      });

      it('should sanitize nested objects', () => {
        const input = {
          user: {
            name: '<malicious>',
            profile: {
              bio: '"quoted text"',
            },
          },
          metadata: {
            tags: ['<tag1>', '<tag2>'],
          },
        };

        const result = sanitizeObject(input);

        expect(result.user.name).toBe('malicious');
        expect(result.user.profile.bio).toBe('quoted text');
        expect(result.metadata.tags).toEqual(['<tag1>', '<tag2>']); // Arrays preserved as-is
      });

      it('should handle null and undefined values', () => {
        const input = {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
        };

        const result = sanitizeObject(input);

        expect(result.nullValue).toBeNull();
        expect(result.undefinedValue).toBeUndefined();
        expect(result.emptyString).toBe('');
      });
    });
  });

  describe('PII Detection and Redaction', () => {
    describe('detectPII', () => {
      it('should detect email addresses', () => {
        const text = 'Contact me at john.doe@example.com or admin@test.org';
        const result = detectPII(text);

        expect(result.email).toEqual(['john.doe@example.com', 'admin@test.org']);
      });

      it('should detect phone numbers', () => {
        const text = 'Call me at 555-123-4567 or (555) 987-6543';
        const result = detectPII(text);

        expect(result.phone).toContain('555-123-4567');
      });

      it('should detect SSNs', () => {
        const text = 'My SSN is 123-45-6789';
        const result = detectPII(text);

        expect(result.ssn).toContain('123-45-6789');
      });

      it('should detect credit card numbers', () => {
        const text = 'Card number: 4532-1234-5678-9012';
        const result = detectPII(text);

        expect(result.creditCard).toContain('4532-1234-5678-9012');
      });

      it('should detect IP addresses', () => {
        const text = 'Server IP: 192.168.1.1 and 10.0.0.1';
        const result = detectPII(text);

        expect(result.ipAddress).toEqual(['192.168.1.1', '10.0.0.1']);
      });

      it('should return empty object for clean text', () => {
        const text = 'This is clean text with no PII';
        const result = detectPII(text);

        expect(Object.keys(result)).toHaveLength(0);
      });
    });

    describe('redactPII', () => {
      it('should redact email addresses', () => {
        const text = 'Contact john.doe@example.com for help';
        const result = redactPII(text);

        expect(result).toBe('Contact [EMAIL] for help');
      });

      it('should redact phone numbers', () => {
        const text = 'Call 555-123-4567 for support';
        const result = redactPII(text);

        expect(result).toBe('Call [PHONE] for support');
      });

      it('should redact SSNs', () => {
        const text = 'SSN: 123-45-6789';
        const result = redactPII(text);

        expect(result).toBe('SSN: [SSN]');
      });

      it('should redact credit card numbers', () => {
        const text = 'Pay with 4532-1234-5678-9012';
        const result = redactPII(text);

        expect(result).toBe('Pay with [CREDIT_CARD]');
      });

      it('should partially redact IP addresses', () => {
        const text = 'Server at 192.168.1.1';
        const result = redactPII(text);

        expect(result).toBe('Server at 192.168.1.xxx');
      });

      it('should handle multiple PII types', () => {
        const text = 'Contact john@test.com at 555-1234 from 192.168.1.1';
        const result = redactPII(text);

        expect(result).toBe('Contact [EMAIL] at [PHONE] from 192.168.1.xxx');
      });
    });
  });

  describe('Audit Logging', () => {
    describe('createAuditLog', () => {
      it('should create audit log with user information', () => {
        mockReq.headers = { 'user-agent': 'Test Browser' };
        mockReq.cookies = { 'anon-session-id': 'session123' };

        const log = createAuditLog(
          mockReq as NextApiRequest,
          'CREATE',
          'message',
          true,
          { messageId: 'test123' }
        );

        expect(log.action).toBe('CREATE');
        expect(log.resource).toBe('message');
        expect(log.success).toBe(true);
        expect(log.sessionId).toBe('session123');
        expect(log.userAgent).toBe('Test Browser');
        expect(log.details).toEqual({ messageId: 'test123' });
        expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('should redact PII in audit log', () => {
        mockReq.headers = { 'user-agent': 'Browser with john@test.com' };

        const log = createAuditLog(
          mockReq as NextApiRequest,
          'LOGIN',
          'auth',
          true
        );

        expect(log.userAgent).toBe('Browser with [EMAIL]');
      });
    });

    describe('getClientIP', () => {
      it('should get IP from x-forwarded-for header', () => {
        mockReq.headers = { 'x-forwarded-for': '203.0.113.1, 198.51.100.2' };

        const ip = getClientIP(mockReq as NextApiRequest);

        expect(ip).toBe('203.0.113.1');
      });

      it('should handle array x-forwarded-for header', () => {
        mockReq.headers = { 'x-forwarded-for': ['203.0.113.1'] };

        const ip = getClientIP(mockReq as NextApiRequest);

        expect(ip).toBe('203.0.113.1');
      });

      it('should fallback to x-real-ip header', () => {
        mockReq.headers = { 'x-real-ip': '203.0.113.1' };

        const ip = getClientIP(mockReq as NextApiRequest);

        expect(ip).toBe('203.0.113.1');
      });

      it('should return unknown when no IP found', () => {
        mockReq.headers = {};
        mockReq.connection = undefined;
        mockReq.socket = undefined;

        const ip = getClientIP(mockReq as NextApiRequest);

        expect(ip).toBe('unknown');
      });
    });
  });

  describe('Comprehensive Security Middleware', () => {
    describe('withSecurity', () => {
      let mockHandler: jest.Mock;

      beforeEach(() => {
        mockHandler = jest.fn();
        mockGetSession.mockResolvedValue(null);
      });

      it('should apply security measures and call handler', async () => {
        const securedHandler = withSecurity(mockHandler);

        await securedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        expect(mockHandler).toHaveBeenCalled();
      });

      it('should handle CORS OPTIONS request', async () => {
        mockReq.method = 'OPTIONS';
        const securedHandler = withSecurity(mockHandler);

        await securedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.end).toHaveBeenCalled();
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('should apply custom CORS configuration', async () => {
        const options = {
          cors: { allowedOrigins: ['https://custom.com'] },
        };
        const securedHandler = withSecurity(mockHandler, options);

        mockReq.headers = { origin: 'https://custom.com' };

        await securedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://custom.com');
        expect(mockHandler).toHaveBeenCalled();
      });

      it('should disable CSRF validation when configured', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        mockReq.method = 'POST';
        const options = { csrf: false };
        const securedHandler = withSecurity(mockHandler, options);

        await securedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockHandler).toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
      });

      it('should handle errors in handler', async () => {
        mockHandler.mockRejectedValue(new Error('Handler error'));
        const securedHandler = withSecurity(mockHandler);

        await securedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: {
            code: 'SECURITY_ERROR',
            message: 'A security error occurred',
          },
        });
      });

      it('should create audit logs when enabled', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const options = { audit: true };
        const securedHandler = withSecurity(mockHandler, options);

        await securedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Audit:',
          expect.stringContaining('"action":"GET"')
        );

        consoleSpy.mockRestore();
      });

      it('should disable audit logging when configured', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const options = { audit: false };
        const securedHandler = withSecurity(mockHandler, options);

        await securedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

        expect(consoleSpy).not.toHaveBeenCalledWith(
          'Audit:',
          expect.any(String)
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed headers gracefully', () => {
      mockReq.headers = {
        origin: null as any,
        'user-agent': undefined as any,
      };

      expect(() => {
        setCorsHeaders(mockReq as NextApiRequest, mockRes as NextApiResponse);
        getClientIP(mockReq as NextApiRequest);
      }).not.toThrow();
    });

    it('should handle Unicode and special characters in PII detection', () => {
      const text = 'Email: test@émojis🚀.com and number: 📞555-1234';
      const pii = detectPII(text);
      const redacted = redactPII(text);

      expect(pii.email).toContain('test@émojis🚀.com');
      expect(redacted).toContain('[EMAIL]');
      expect(redacted).toContain('[PHONE]');
    });

    it('should handle very long input strings', () => {
      const longText = 'a'.repeat(10000) + 'test@example.com' + 'b'.repeat(10000);
      const pii = detectPII(longText);
      const redacted = redactPII(longText);

      expect(pii.email).toContain('test@example.com');
      expect(redacted).toContain('[EMAIL]');
    });

    it('should handle null and undefined values in sanitization', () => {
      expect(() => {
        sanitizeInput(null as any);
        sanitizeInput(undefined as any);
        sanitizeObject(null as any);
        sanitizeObject(undefined as any);
      }).not.toThrow();
    });
  });
});