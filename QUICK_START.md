# 🚀 Quick Start Guide - Post-Implementation

## Immediate Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Validate Environment Configuration
```bash
# This will check all required environment variables
npm run validate:env
```

If you see errors, update your `.env` file with the required variables.

### 3. Generate Prisma Clients
```bash
# For web mode (PostgreSQL)
npm run db:generate

# For desktop mode (SQLite)
npm run db:local:generate

# Or generate both at once
npm run db:generate:all
```

### 4. Test the Setup
```bash
# Start development server
npm run dev

# In another terminal, check health
curl http://localhost:3000/api/health
```

You should see a JSON response with system health status.

---

## 🧪 Testing New Features

### Test Authentication
```bash
# Try accessing tenders without auth (should fail with 401)
curl http://localhost:3000/api/tenders

# Login first, then use the session
# Access via browser at http://localhost:3000/login
```

### Test Rate Limiting
```bash
# Rapid requests should trigger rate limiting
for i in {1..15}; do
  curl http://localhost:3000/api/tenders
done

# Should see 429 Too Many Requests after hitting limit
```

### Test Environment Validation
```bash
# Run validation script
npm run validate:env

# Output shows:
# - Configured environment
# - Available AI providers
# - Database status
# - Cache configuration
```

### Test Health Check
```bash
# Basic check
curl http://localhost:3000/api/health

# Pretty print
curl http://localhost:3000/api/health | jq '.'
```

---

## 🔐 Security Configuration

### Required Environment Variables
```env
# Authentication (REQUIRED)
NEXTAUTH_SECRET="your-secret-minimum-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# Database (REQUIRED)
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# AI Providers (At least one REQUIRED)
GROQ_API_KEY="your-groq-key"
GEMINI_API_KEY="your-gemini-key"
```

### Optional Environment Variables
```env
# Business Rules (Optional - defaults provided)
AUTO_APPROVE_THRESHOLD=1000
MANAGER_APPROVE_THRESHOLD=10000
FINANCE_MANAGER_APPROVE_THRESHOLD=50000
CFO_APPROVE_THRESHOLD=100000

# Budget Alerts (Optional)
BUDGET_WARNING_THRESHOLD=80
BUDGET_CRITICAL_THRESHOLD=90

# Redis Cache (Optional)
REDIS_URL="redis://localhost:6379"

# OCR Services (Optional)
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_REGION="us-east-1"
```

---

## 🎯 Using New Features

### 1. RBAC in API Routes
```typescript
import { requirePermission } from '@/lib/rbac'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Check if user has permission
  requirePermission(session, 'budgets', 'create')
  
  // Proceed with logic
}
```

### 2. Rate Limiting
```typescript
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request)
  if (rateLimitResult) return rateLimitResult
  
  // Proceed with logic
}
```

### 3. Error Handling
```typescript
import { handleError, ValidationError } from '@/lib/errors/error-handler'

export async function GET(request: NextRequest) {
  try {
    // Your logic here
  } catch (error) {
    return handleError(error)
  }
}
```

### 4. File Validation
```typescript
import { validateFile } from '@/lib/security/file-validator'

const validation = await validateFile(buffer, {
  maxSize: 50 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf'],
  detectMimeType: true,
})

if (!validation.valid) {
  throw new ValidationError(validation.errors.join(', '))
}
```

### 5. Business Rules
```typescript
import { getRequiredApprovalLevel, APPROVAL_THRESHOLDS } from '@/lib/config/business-rules'

// Get approval level for amount
const level = getRequiredApprovalLevel(15000) // Returns 'FINANCE_MANAGER'

// Access thresholds
const managerLimit = APPROVAL_THRESHOLDS.MANAGER // 10000
```

---

## 📊 Monitoring & Debugging

### Health Check Dashboard
Visit: `http://localhost:3000/api/health`

Shows:
- Database connectivity
- AI provider status
- Redis availability
- Environment configuration
- System uptime
- Response times

### Check Logs
All errors and important events are logged with context:
```javascript
// Logs include:
// - Request ID
// - User IP
// - User agent
// - Request path
// - Duration
// - Error details
```

### Debug Mode
```bash
# Enable detailed logging
LOG_LEVEL=debug npm run dev
```

---

## 🚨 Common Issues & Solutions

### Issue: "Environment validation failed"
**Solution:** Run `npm run validate:env` to see which variables are missing.

### Issue: "No AI providers configured"
**Solution:** Set at least one AI provider API key in `.env`:
```env
GROQ_API_KEY="your-key-here"
```

### Issue: "Database connection failed"
**Solution:** Check your `DATABASE_URL` is correct and database is running.

### Issue: "Rate limit exceeded"
**Solution:** Wait for the time window to reset or adjust limits in `RateLimitPresets`.

### Issue: "Insufficient permissions"
**Solution:** Check user role in database. Admin/CEO have highest privileges.

---

## 🔄 CI/CD Setup

### GitHub Actions
The CI/CD pipeline automatically runs on:
- Push to `main` or `develop` branches
- Pull requests to `main`

**Required Secrets:**
```yaml
RAILWAY_TOKEN       # For Railway deployment
RAILWAY_URL         # Your app URL for health checks
SNYK_TOKEN          # For security scanning (optional)
```

### Manual Deployment
```bash
# Deploy web app
npm run build
# Then deploy to Railway/Vercel

# Build desktop app
npm run electron:build
```

---

## 📚 Additional Resources

- **API Documentation:** Visit `/api-docs` (if Swagger is configured)
- **Health Check:** `/api/health`
- **Database Studio:** `npm run prisma:studio`
- **Test Coverage:** `npm run test:coverage`

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] All environment variables validated (`npm run validate:env`)
- [ ] Database migrations applied (`npm run db:migrate`)
- [ ] Tests passing (`npm test`)
- [ ] Health check returns "healthy" (`curl /api/health`)
- [ ] RBAC permissions tested
- [ ] Rate limiting working
- [ ] Error handling tested
- [ ] File upload validation tested
- [ ] AI providers responding
- [ ] Monitoring/logging configured

---

## 🎉 You're Ready!

All improvements have been implemented and tested. Your application now has:

✅ Enterprise-grade security
✅ Comprehensive error handling
✅ Performance optimizations
✅ Automated CI/CD
✅ Full monitoring capabilities

Deploy with confidence! 🚀
