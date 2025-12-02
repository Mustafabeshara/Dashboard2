# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please email security@beshara.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We will respond within 48 hours and provide a timeline for fixes.

## Security Measures

### Authentication & Authorization
- **JWT-based authentication** with NextAuth.js
- **Role-based access control (RBAC)** with 8 distinct roles
- **Session timeout**: 30 minutes of inactivity
- **Password requirements**: Minimum 8 characters, complexity rules enforced
- **API route protection**: All routes require authentication

### Data Protection
- **Encryption at rest**: PostgreSQL native encryption
- **Encryption in transit**: HTTPS/TLS 1.3 required
- **Input validation**: Zod schemas on all inputs
- **SQL injection prevention**: Prisma ORM with parameterized queries
- **XSS protection**: React automatic escaping + Content Security Policy

### Rate Limiting
- **API rate limits**: Sliding window algorithm
  - Strict: 10 requests/minute
  - Standard: 100 requests/minute
  - Generous: 1000 requests/minute
- **In-memory tracking** with automatic cleanup

### File Upload Security
- **MIME type validation**: Checks actual file content, not just extension
- **File size limits**: Configurable per upload type
- **Allowed extensions**: Whitelist approach
- **Virus scanning**: Optional integration available
- **Path sanitization**: Prevents directory traversal

### Environment Variables
- **Validation**: Zod-based schema validation on startup
- **Fail-fast approach**: Application won't start with invalid config
- **Sensitive data**: Never logged or exposed in error messages
- **Script**: `npm run validate:env` to check configuration

### Audit Logging
- **All financial transactions** logged with user ID, timestamp, and changes
- **Budget approvals** tracked with full audit trail
- **Database changes** logged for compliance
- **Retention**: 7 years for financial records (Kuwait regulatory requirement)

### Dependencies
- **Regular updates**: `npm audit` run on CI/CD pipeline
- **Vulnerability scanning**: Automated with GitHub Dependabot
- **Zero high/critical vulnerabilities** policy
- **Lock file**: package-lock.json committed for reproducible builds

## Resolved Security Issues

### December 2, 2025
- **Removed xlsx library** (CVE-2024-XXXX): Prototype pollution + ReDoS vulnerabilities
  - Impact: High severity, but library was not actually used in code
  - Resolution: Removed from package.json
  - Alternative: Using custom CSV export, will implement exceljs when needed

## Security Best Practices

### For Developers
1. Never commit `.env` files or API keys
2. Use `@/lib/rbac.ts` for authorization checks
3. Validate all inputs with Zod schemas
4. Use `asyncHandler()` from error-handler for consistent error handling
5. Run `npm run validate:env` before deployment
6. Check `npm audit` output and address vulnerabilities

### For Administrators
1. Rotate API keys every 90 days
2. Review audit logs weekly
3. Enable two-factor authentication for admin accounts
4. Keep PostgreSQL and Node.js updated
5. Monitor rate limit violations
6. Regular backup verification (test restores monthly)

### For Users
1. Use strong, unique passwords
2. Log out when finished
3. Report suspicious activity immediately
4. Don't share credentials
5. Verify HTTPS connection before entering sensitive data

## Compliance

### Standards
- **GDPR**: User data privacy controls implemented
- **Kuwait MOH regulations**: Healthcare data handling compliance
- **Financial regulations**: Audit trail retention (7 years)

### Data Retention
- **Audit logs**: 7 years
- **Financial transactions**: 7 years
- **User sessions**: 30 days
- **Temporary files**: 24 hours

## Contact

For security concerns: security@beshara.com  
For general support: it@beshara.com

---

Last updated: December 2, 2025
