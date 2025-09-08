import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getSession } from 'next-auth/react';

// ========== TYPES ==========

interface SecurityConfig {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
  secure?: boolean;
}

interface CSRFConfig {
  secretKey: string;
  cookieName?: string;
  headerName?: string;
  maxAge?: number;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}

// ========== CORS CONFIGURATION ==========

const DEFAULT_CORS_CONFIG: SecurityConfig = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-domain.com', // Replace with actual production domain
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'Accept',
    'Origin',
  ],
  maxAge: 86400, // 24 hours
  credentials: true,
};

// Environment-specific CORS configuration
function getCorsConfig(): SecurityConfig {
  const env = process.env.NODE_ENV;
  
  if (env === 'development') {
    return {
      ...DEFAULT_CORS_CONFIG,
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ],
    };
  }
  
  if (env === 'production') {
    return {
      ...DEFAULT_CORS_CONFIG,
      allowedOrigins: [
        process.env.NEXTAUTH_URL || 'https://your-domain.com',
        // Add other production domains here
      ],
      secure: true,
    };
  }
  
  return DEFAULT_CORS_CONFIG;
}

// ========== CORS MIDDLEWARE ==========

export function setCorsHeaders(req: NextApiRequest, res: NextApiResponse, config?: Partial<SecurityConfig>): void {
  const corsConfig = { ...getCorsConfig(), ...config };
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && corsConfig.allowedOrigins) {
    if (corsConfig.allowedOrigins.includes(origin) || corsConfig.allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (!origin && process.env.NODE_ENV === 'development') {
    // Allow requests without origin in development (e.g., from Postman)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Set other CORS headers
  if (corsConfig.allowedMethods) {
    res.setHeader('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '));
  }
  
  if (corsConfig.allowedHeaders) {
    res.setHeader('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
  }
  
  if (corsConfig.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (corsConfig.maxAge) {
    res.setHeader('Access-Control-Max-Age', corsConfig.maxAge.toString());
  }
}

export function handleCorsOptions(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(200).end();
    return true;
  }
  return false;
}

// ========== CSRF PROTECTION ==========

const DEFAULT_CSRF_CONFIG: CSRFConfig = {
  secretKey: process.env.NEXTAUTH_SECRET || 'default-secret-change-in-production',
  cookieName: '__csrf-token',
  headerName: 'x-csrf-token',
  maxAge: 3600, // 1 hour
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
};

function generateCSRFToken(sessionId: string, secret: string): string {
  const timestamp = Date.now().toString();
  const data = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  
  return Buffer.from(`${data}:${signature}`).toString('base64');
}

function validateCSRFToken(token: string, sessionId: string, secret: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [sessionPart, timestampPart, signature] = decoded.split(':');
    
    if (sessionPart !== sessionId) {
      return false;
    }
    
    const timestamp = parseInt(timestampPart, 10);
    const now = Date.now();
    
    // Check if token is expired (1 hour)
    if (now - timestamp > DEFAULT_CSRF_CONFIG.maxAge! * 1000) {
      return false;
    }
    
    // Verify signature
    const data = `${sessionPart}:${timestampPart}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    return false;
  }
}

export async function setCSRFToken(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const session = await getSession({ req });
  const sessionId = session?.user?.id || req.cookies['anon-session-id'] || 'anonymous';
  
  const token = generateCSRFToken(sessionId, DEFAULT_CSRF_CONFIG.secretKey);
  
  // Set CSRF token as HTTP-only cookie
  const cookieOptions = [
    `${DEFAULT_CSRF_CONFIG.cookieName}=${token}`,
    `Path=/`,
    `Max-Age=${DEFAULT_CSRF_CONFIG.maxAge}`,
    `SameSite=${DEFAULT_CSRF_CONFIG.sameSite}`,
    'HttpOnly',
  ];
  
  if (DEFAULT_CSRF_CONFIG.secure) {
    cookieOptions.push('Secure');
  }
  
  res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

export async function validateCSRF(req: NextApiRequest): Promise<boolean> {
  // Skip CSRF validation for GET requests and in development
  if (req.method === 'GET' || process.env.NODE_ENV === 'development') {
    return true;
  }
  
  const token = req.headers[DEFAULT_CSRF_CONFIG.headerName!] as string || 
                req.cookies[DEFAULT_CSRF_CONFIG.cookieName!];
  
  if (!token) {
    return false;
  }
  
  const session = await getSession({ req });
  const sessionId = session?.user?.id || req.cookies['anon-session-id'] || 'anonymous';
  
  return validateCSRFToken(token, sessionId, DEFAULT_CSRF_CONFIG.secretKey);
}

// ========== SECURITY HEADERS ==========

export function setSecurityHeaders(res: NextApiResponse): void {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust as needed for your app
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

// ========== INPUT SANITIZATION ==========

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .trim()
    .slice(0, 1000); // Limit length
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value);
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
}

// ========== PII DETECTION AND HANDLING ==========

// Patterns for detecting potential PII
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
};

export function detectPII(text: string): { [key: string]: string[] } {
  const detected: { [key: string]: string[] } = {};
  
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      detected[type] = matches;
    }
  }
  
  return detected;
}

export function redactPII(text: string): string {
  let redacted = text;
  
  // Redact emails
  redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL]');
  
  // Redact phone numbers
  redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE]');
  
  // Redact SSNs
  redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN]');
  
  // Redact credit cards
  redacted = redacted.replace(PII_PATTERNS.creditCard, '[CREDIT_CARD]');
  
  // Redact IP addresses (but keep last octet for debugging)
  redacted = redacted.replace(PII_PATTERNS.ipAddress, (match) => {
    const parts = match.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  });
  
  return redacted;
}

// ========== AUDIT LOGGING ==========

interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  success: boolean;
  details?: any;
}

export function createAuditLog(
  req: NextApiRequest,
  action: string,
  resource: string,
  success: boolean,
  details?: any
): AuditLogEntry {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  return {
    timestamp: new Date().toISOString(),
    sessionId: req.cookies['anon-session-id'],
    action,
    resource,
    ip: redactPII(ip), // Redact IP for privacy
    userAgent: redactPII(userAgent),
    success,
    details: details ? sanitizeObject(details) : undefined,
  };
}

export function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }
  
  return req.headers['x-real-ip'] as string || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown';
}

// ========== COMPREHENSIVE SECURITY MIDDLEWARE ==========

export function withSecurity<T extends NextApiRequest, U extends NextApiResponse>(
  handler: (req: T, res: U) => Promise<void> | void,
  options?: {
    cors?: Partial<SecurityConfig>;
    csrf?: boolean;
    audit?: boolean;
  }
) {
  return async function securedHandler(req: T, res: U): Promise<void> {
    const { cors = {}, csrf = true, audit = true } = options || {};
    
    try {
      // Set security headers
      setSecurityHeaders(res);
      
      // Handle CORS
      setCorsHeaders(req, res, cors);
      if (handleCorsOptions(req, res)) {
        return;
      }
      
      // CSRF protection for non-GET requests
      if (csrf && req.method !== 'GET') {
        const isValidCSRF = await validateCSRF(req);
        if (!isValidCSRF) {
          res.status(403).json({
            error: {
              code: 'CSRF_INVALID',
              message: 'Invalid or missing CSRF token',
            },
          });
          return;
        }
      }
      
      // Create audit log entry if enabled
      let auditEntry: AuditLogEntry | null = null;
      if (audit) {
        auditEntry = createAuditLog(req, req.method || 'UNKNOWN', req.url || 'unknown', false);
      }
      
      // Execute the handler
      await handler(req, res);
      
      // Update audit log with success status
      if (audit && auditEntry) {
        auditEntry.success = res.statusCode < 400;
        // In a real application, you would log this to your audit system
        console.log('Audit:', JSON.stringify(auditEntry));
      }
      
    } catch (error) {
      console.error('Security middleware error:', error);
      
      // Log security error in audit
      if (audit) {
        const errorAudit = createAuditLog(req, req.method || 'UNKNOWN', req.url || 'unknown', false, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.log('Security Error Audit:', JSON.stringify(errorAudit));
      }
      
      res.status(500).json({
        error: {
          code: 'SECURITY_ERROR',
          message: 'A security error occurred',
        },
      });
    }
  };
}

// ========== PII HANDLING GUIDELINES ==========

/*
PII HANDLING GUIDELINES:

1. Data Classification:
   - Identify and classify all data types in your application
   - Mark fields that contain or may contain PII
   - Implement data retention policies

2. Collection Principles:
   - Only collect PII that is necessary for business purposes
   - Obtain explicit consent before collecting sensitive data
   - Provide clear privacy notices

3. Storage Security:
   - Encrypt PII at rest and in transit
   - Use strong encryption algorithms (AES-256)
   - Store encryption keys separately from data

4. Access Controls:
   - Implement role-based access controls
   - Use principle of least privilege
   - Audit all access to PII

5. Data Processing:
   - Pseudonymize or anonymize data when possible
   - Use the redactPII function for logging and debugging
   - Implement data masking for non-production environments

6. Data Sharing:
   - Never share PII with third parties without consent
   - Use data processing agreements for vendors
   - Implement secure data transfer protocols

7. User Rights:
   - Provide mechanisms for users to access their data
   - Allow users to update or delete their information
   - Implement data portability features

8. Breach Response:
   - Monitor for data breaches and unauthorized access
   - Have an incident response plan
   - Notify authorities and affected users as required by law

9. Compliance:
   - Follow applicable privacy laws (GDPR, CCPA, etc.)
   - Conduct regular privacy impact assessments
   - Maintain documentation of data processing activities

10. Technical Safeguards:
    - Use the detectPII function to scan for accidental PII exposure
    - Implement data loss prevention measures
    - Regular security audits and penetration testing

Example usage in API handlers:
```typescript
export default withSecurity(async (req, res) => {
  // Your API logic here
  const userInput = sanitizeInput(req.body.message);
  
  // Check for PII before logging
  const piiDetected = detectPII(userInput);
  if (Object.keys(piiDetected).length > 0) {
    console.warn('PII detected in input:', Object.keys(piiDetected));
  }
  
  // Log sanitized version
  console.log('Processing message:', redactPII(userInput));
  
  // ... rest of your handler
}, {
  cors: { allowedOrigins: ['https://trusted-domain.com'] },
  csrf: true,
  audit: true,
});
```
*/