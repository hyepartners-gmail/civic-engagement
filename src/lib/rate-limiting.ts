import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

// ========== TYPES ==========

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextApiRequest) => Promise<string> | string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ========== IN-MEMORY STORE ==========

// In a production environment, you'd want to use Redis or another persistent store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup function to remove expired entries
const cleanupExpiredEntries = () => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

// ========== RATE LIMIT MIDDLEWARE ==========

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later.',
  } = config;

  return async function rateLimitMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void> | void
  ): Promise<void> {
    try {
      // Generate rate limit key
      const key = keyGenerator ? await keyGenerator(req) : await defaultKeyGenerator(req);
      
      const now = Date.now();
      const resetTime = now + windowMs;
      
      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      
      if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired entry
        entry = {
          count: 0,
          resetTime,
        };
        rateLimitStore.set(key, entry);
      }
      
      // Check if limit exceeded
      if (entry.count >= maxRequests) {
        const timeUntilReset = Math.ceil((entry.resetTime - now) / 1000);
        
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter: timeUntilReset,
          },
        });
        return;
      }
      
      // Increment counter before processing request
      if (!skipSuccessfulRequests && !skipFailedRequests) {
        entry.count++;
      }
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
      
      // Store original end function to intercept response
      const originalEnd = res.end;
      let hasEnded = false;
      
      res.end = function(chunk?: any, encoding?: any) {
        if (!hasEnded) {
          hasEnded = true;
          
          // Update counter based on response status
          if (skipSuccessfulRequests && res.statusCode < 400) {
            entry!.count = Math.max(0, entry!.count - 1);
          } else if (skipFailedRequests && res.statusCode >= 400) {
            entry!.count = Math.max(0, entry!.count - 1);
          }
        }
        
        return originalEnd.call(this, chunk, encoding);
      };
      
      // Call next middleware/handler
      await next();
      
    } catch (error) {
      console.error('Rate limiting error:', error);
      
      // In case of rate limiting error, allow the request to proceed
      // to avoid blocking legitimate traffic
      await next();
    }
  };
}

// ========== DEFAULT KEY GENERATOR ==========

async function defaultKeyGenerator(req: NextApiRequest): Promise<string> {
  // Try to get user ID from session first
  const session = await getSession({ req });
  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }
  
  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.socket.remoteAddress;
  return `ip:${ip || 'unknown'}`;
}

// ========== SPECIALIZED KEY GENERATORS ==========

export async function sessionBasedKeyGenerator(req: NextApiRequest): Promise<string> {
  // Try user ID first
  const session = await getSession({ req });
  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }
  
  // Fall back to anonymous session ID from cookies
  const anonSessionId = req.cookies['anon-session-id'];
  if (anonSessionId) {
    return `anon:${anonSessionId}`;
  }
  
  // Final fallback to IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.socket.remoteAddress;
  return `ip:${ip || 'unknown'}`;
}

export function ipBasedKeyGenerator(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.socket.remoteAddress;
  return `ip:${ip || 'unknown'}`;
}

// ========== PREDEFINED RATE LIMITERS ==========

// Standard rate limiter for vote endpoints: 60 requests per minute
export const voteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  keyGenerator: sessionBasedKeyGenerator,
  message: 'Too many vote requests. Please wait before voting again.',
});

// Strict rate limiter for admin endpoints: 100 requests per minute
export const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: async (req) => {
    const session = await getSession({ req });
    return session?.user?.id ? `admin:${session.user.id}` : `ip:${ipBasedKeyGenerator(req)}`;
  },
  message: 'Too many admin requests. Please slow down.',
});

// Relaxed rate limiter for public read endpoints: 200 requests per minute
export const publicReadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200,
  keyGenerator: ipBasedKeyGenerator,
  message: 'Too many requests. Please try again later.',
});

// ========== UTILITY FUNCTIONS ==========

export function withRateLimit<T extends NextApiRequest, U extends NextApiResponse>(
  rateLimiter: ReturnType<typeof createRateLimiter>,
  handler: (req: T, res: U) => Promise<void> | void
) {
  return async function rateLimitedHandler(req: T, res: U): Promise<void> {
    await rateLimiter(req, res, async () => {
      await handler(req, res);
    });
  };
}

// Reset rate limit for a specific key (useful for testing or admin overrides)
export function resetRateLimit(key: string): boolean {
  return rateLimitStore.delete(key);
}

// Get current rate limit status for a key
export function getRateLimitStatus(key: string): RateLimitEntry | null {
  return rateLimitStore.get(key) || null;
}

// Get all active rate limit entries (for monitoring)
export function getAllRateLimitEntries(): Array<[string, RateLimitEntry]> {
  return Array.from(rateLimitStore.entries());
}