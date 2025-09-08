import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { ErrorResponse } from './messaging-schemas';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
    isVerified?: boolean;
  };
}

/**
 * Middleware to check if user is authenticated and has admin role
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedRequest | null> {
  // Check session
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    };
    res.status(401).json(errorResponse);
    return null;
  }

  const user = session.user as any;
  
  if (!user || user.role !== 'admin') {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      }
    };
    res.status(403).json(errorResponse);
    return null;
  }

  // Add user info to request object
  (req as AuthenticatedRequest).user = {
    id: user.id || user.email, // Fallback to email if no ID
    email: user.email,
    role: user.role,
    name: user.name,
    isVerified: user.isVerified,
  };

  return req as AuthenticatedRequest;
}

/**
 * Middleware to check if user is authenticated (any role)
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedRequest | null> {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    };
    res.status(401).json(errorResponse);
    return null;
  }

  const user = session.user as any;
  
  if (!user) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid session'
      }
    };
    res.status(401).json(errorResponse);
    return null;
  }

  // Add user info to request object
  (req as AuthenticatedRequest).user = {
    id: user.id || user.email,
    email: user.email,
    role: user.role || 'user',
    name: user.name,
    isVerified: user.isVerified,
  };

  return req as AuthenticatedRequest;
}

/**
 * Higher-order function to wrap API handlers with admin authentication
 */
export function withAdminAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authenticatedReq = await requireAdmin(req, res);
    if (!authenticatedReq) {
      return; // Response already sent by requireAdmin
    }
    return handler(authenticatedReq, res);
  };
}

/**
 * Higher-order function to wrap API handlers with basic authentication
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authenticatedReq = await requireAuth(req, res);
    if (!authenticatedReq) {
      return; // Response already sent by requireAuth
    }
    return handler(authenticatedReq, res);
  };
}

/**
 * Utility to get user context for vote attribution from authenticated request
 */
export function getUserContextFromAuth(req: AuthenticatedRequest): {
  userId?: string;
  geoBucket?: string;
  partyBucket?: 'D' | 'R' | 'I' | 'O' | 'U';
  demoBucket?: string;
} {
  // This would be enhanced with actual user profile data
  // For now, return basic structure
  return {
    userId: req.user.id,
    // TODO: Derive these from user profile when implemented
    geoBucket: undefined,
    partyBucket: undefined,
    demoBucket: undefined,
  };
}

/**
 * Utility to get anonymous session ID from request for vote deduplication
 */
export function getAnonSessionId(req: NextApiRequest): string | undefined {
  // Check for session cookie or generate one
  const sessionCookie = req.cookies['anon-session-id'];
  if (sessionCookie) {
    return sessionCookie;
  }
  
  // If no session cookie, this would typically be set by the client
  // or generated here and sent back as a Set-Cookie header
  return undefined;
}

/**
 * Utility to set anonymous session cookie
 */
export function setAnonSessionCookie(res: NextApiResponse, sessionId: string): void {
  res.setHeader('Set-Cookie', `anon-session-id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);
}

/**
 * Validate HTTP method and respond with 405 if not allowed
 */
export function validateMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedMethods: string[]
): boolean {
  if (!allowedMethods.includes(req.method || '')) {
    res.setHeader('Allow', allowedMethods);
    const errorResponse: ErrorResponse = {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed`
      }
    };
    res.status(405).json(errorResponse);
    return false;
  }
  return true;
}

/**
 * Set standard headers for API responses
 */
export function setStandardHeaders(res: NextApiResponse): void {
  // CORS headers for same-origin policy
  res.setHeader('Access-Control-Allow-Origin', 'same-origin');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Cache control headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

/**
 * Set caching headers for GET endpoints that can be cached
 */
export function setCacheHeaders(res: NextApiResponse, maxAge: number = 30): void {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge}`);
}