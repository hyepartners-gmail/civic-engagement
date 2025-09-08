# Security Implementation Guide

This document outlines the security measures implemented in the Political Messaging Testbed application and provides guidelines for maintaining security standards.

## 🔒 Implemented Security Measures

### 1. Cross-Origin Resource Sharing (CORS)

**Implementation**: `src/lib/security.ts`

- Environment-specific CORS configuration
- Whitelist of allowed origins
- Secure defaults for production
- Flexible configuration for development

**Configuration**:
```typescript
// Development
allowedOrigins: ['http://localhost:3000', 'http://localhost:3001']

// Production
allowedOrigins: [process.env.NEXTAUTH_URL]
```

### 2. Cross-Site Request Forgery (CSRF) Protection

**Implementation**: `src/lib/security.ts`

- Token-based CSRF protection
- Session-bound token generation
- Automatic token validation for non-GET requests
- Configurable token expiration (1 hour default)

**Usage**:
```typescript
import { withSecurity } from '@/lib/security';

export default withSecurity(handler, {
  csrf: true,
  audit: true
});
```

### 3. Rate Limiting

**Implementation**: `src/lib/rate-limiting.ts`

- Voting endpoints: 60 requests/minute per IP/session
- Admin endpoints: 100 requests/minute per user
- Public read endpoints: 200 requests/minute per IP
- In-memory store with automatic cleanup

**Applied to**:
- `/api/messages/vote-batch`
- `/api/messages/abtest/vote-batch`
- `/api/admin/messages/*`
- `/api/messages`

### 4. Security Headers

**Implementation**: `next.config.mjs` and `src/lib/security.ts`

- **Strict-Transport-Security**: Enforce HTTPS
- **X-Content-Type-Options**: Prevent MIME sniffing
- **X-Frame-Options**: Prevent clickjacking
- **X-XSS-Protection**: Enable XSS filtering
- **Content-Security-Policy**: Comprehensive CSP
- **Referrer-Policy**: Control referrer information
- **Permissions-Policy**: Restrict browser features

### 5. Input Sanitization and Validation

**Implementation**: `src/lib/security.ts`

- Automatic input sanitization for strings
- Object-level sanitization
- Zod schema validation for all API inputs
- Length limits and character filtering

### 6. PII Detection and Protection

**Implementation**: `src/lib/security.ts`

- Automatic PII detection patterns:
  - Email addresses
  - Phone numbers
  - Social Security Numbers
  - Credit card numbers
  - IP addresses

- PII redaction for logging
- Guidelines for PII handling compliance

### 7. Audit Logging

**Implementation**: `src/lib/security.ts`

- Comprehensive audit trail
- User action tracking
- IP address logging (redacted)
- Success/failure tracking
- Structured logging format

## 🛡️ Security Configuration

### Environment Variables

Required security-related environment variables:

```bash
# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.com

# Database
GCP_PROJECT_ID=your-gcp-project
GCP_KEYFILE_JSON=your-service-account-key

# Production settings
NODE_ENV=production
```

### Production Deployment Checklist

- [ ] Set strong `NEXTAUTH_SECRET` (min 32 characters)
- [ ] Configure proper `NEXTAUTH_URL`
- [ ] Enable HTTPS/TLS
- [ ] Set up proper CORS origins
- [ ] Review and test CSP policies
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Regular security updates

## 🔍 Security Testing

### Manual Testing

1. **CORS Testing**:
   ```bash
   curl -H "Origin: https://malicious-site.com" \
        -X POST \
        https://your-domain.com/api/messages/vote-batch
   ```

2. **CSRF Testing**:
   ```bash
   curl -X POST \
        -H "Content-Type: application/json" \
        -d '{"votes":[]}' \
        https://your-domain.com/api/messages/vote-batch
   ```

3. **Rate Limiting Testing**:
   ```bash
   for i in {1..65}; do
     curl https://your-domain.com/api/messages/vote-batch -X POST
   done
   ```

### Automated Security Scans

Recommended tools:
- **OWASP ZAP**: Web application security scanner
- **npm audit**: Check for vulnerable dependencies
- **Snyk**: Continuous security monitoring
- **ESLint Security**: Static analysis for security issues

## 📋 PII Handling Guidelines

### Data Classification

1. **Public Data**: Messages, vote counts, aggregated statistics
2. **Personal Data**: User profiles, voting history, session data
3. **Sensitive Data**: Admin credentials, API keys, internal logs

### Collection Principles

- **Minimal Collection**: Only collect necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Consent Management**: Obtain explicit consent for data processing
- **Transparency**: Clear privacy notices and data usage

### Storage Security

- **Encryption at Rest**: Use Google Cloud Datastore encryption
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Access Controls**: Role-based access with least privilege
- **Data Retention**: Implement retention policies and automated deletion

### Processing Guidelines

```typescript
// Example: Safe data processing
import { detectPII, redactPII, sanitizeInput } from '@/lib/security';

function processUserInput(input: string) {
  // 1. Sanitize input
  const sanitized = sanitizeInput(input);
  
  // 2. Check for PII
  const piiDetected = detectPII(sanitized);
  if (Object.keys(piiDetected).length > 0) {
    console.warn('PII detected:', Object.keys(piiDetected));
    // Handle according to your privacy policy
  }
  
  // 3. Log safely
  console.log('Processing:', redactPII(sanitized));
  
  return sanitized;
}
```

### User Rights Implementation

- **Data Access**: API endpoint for users to download their data
- **Data Correction**: Allow users to update their information
- **Data Deletion**: Implement "right to be forgotten"
- **Data Portability**: Export user data in standard formats

## 🚨 Incident Response

### Security Incident Procedure

1. **Detection**: Monitor logs and alerts
2. **Assessment**: Evaluate scope and impact
3. **Containment**: Isolate affected systems
4. **Investigation**: Analyze root cause
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

### Contact Information

- **Security Team**: security@your-domain.com
- **Emergency Contact**: +1-xxx-xxx-xxxx
- **Incident Reporting**: incidents@your-domain.com

## 📚 Compliance Requirements

### GDPR Compliance

- [ ] Privacy by Design implementation
- [ ] Data Protection Impact Assessment (DPIA)
- [ ] Cookie consent management
- [ ] Data breach notification procedures
- [ ] Data Processing Agreements (DPAs)

### CCPA Compliance

- [ ] Consumer privacy rights implementation
- [ ] Opt-out mechanisms
- [ ] Data deletion procedures
- [ ] Privacy policy updates

## 🔄 Regular Security Maintenance

### Monthly Tasks

- [ ] Review access logs and audit trails
- [ ] Update dependencies and security patches
- [ ] Review and test incident response procedures
- [ ] Verify backup and recovery systems

### Quarterly Tasks

- [ ] Security assessment and penetration testing
- [ ] Review and update security policies
- [ ] Employee security training
- [ ] Third-party security assessments

### Annual Tasks

- [ ] Comprehensive security audit
- [ ] Risk assessment and threat modeling
- [ ] Business continuity plan review
- [ ] Compliance audit and certification

## 📖 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Google Cloud Security](https://cloud.google.com/security)
- [GDPR Guidelines](https://gdpr.eu/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Review Date**: March 2025