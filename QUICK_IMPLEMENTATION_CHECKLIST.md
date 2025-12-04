# Quick Implementation Checklist

**Enterprise Security & Performance Features**
**Time Estimate:** 2-3 days for full implementation

---

## Prerequisites

- [x] Next.js 16 App Router
- [x] Prisma 6.8.2
- [x] PostgreSQL on Railway
- [x] Redis package installed (5.10.0)
- [x] TypeScript configured

---

## Feature 1: Rate Limiting (4 hours)

### Step 1: Install Upstash (10 min)

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Step 2: Set up Upstash Account (15 min)

1. Go to https://console.upstash.com
2. Create free Redis database
3. Copy REST URL and Token
4. Add to `.env`:
   ```bash
   UPSTASH_REDIS_REST_URL="https://your-endpoint.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-token"
   ```

### Step 3: Create Rate Limiter (30 min)

- **File:** `/src/lib/rate-limit-redis.ts`
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 1
- **Lines:** 65-215

### Step 4: Update API Routes (2 hours)

**Priority Endpoints:**

1. **Auth routes** (use `rateLimiters.auth`):
   - `/src/app/api/auth/[...nextauth]/route.ts`

2. **AI endpoints** (use `rateLimiters.ai`):
   - `/src/app/api/tenders/[id]/analyze/route.ts`
   - `/src/app/api/expenses/[id]/categorize/route.ts`
   - `/src/app/api/inventory/optimize/route.ts`
   - `/src/app/api/forecasts/generate/route.ts`

3. **Upload endpoints** (use `rateLimiters.upload`):
   - `/src/app/api/documents/upload/route.ts`

4. **Standard endpoints** (use `rateLimiters.standard`):
   - All other API routes

**Example:**
```typescript
import { rateLimit, rateLimiters } from '@/lib/rate-limit-redis'

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request, rateLimiters.ai)
  if (rateLimitResponse) return rateLimitResponse

  // Your logic here...
}
```

### Step 5: Test (30 min)

```bash
# Test rate limit
for i in {1..15}; do
  curl http://localhost:3000/api/tenders
  echo "Request $i"
done
```

### Step 6: Deploy to Railway (15 min)

Add environment variables in Railway:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

## Feature 2: CORS Middleware (1 hour)

### Step 1: Create Middleware (30 min)

- **File:** `/src/middleware.ts` (create new file in src root)
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 2
- **Lines:** 20-122

### Step 2: Configure Environment (5 min)

```bash
# .env
NEXTAUTH_URL=https://your-app.railway.app
ALLOWED_ORIGINS=https://dashboard.example.com,https://admin.example.com
```

### Step 3: Test (15 min)

```bash
# Test CORS
curl -X OPTIONS http://localhost:3000/api/tenders \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### Step 4: Deploy (10 min)

- Commit middleware.ts
- Push to Railway
- Verify CORS headers in production

---

## Feature 3: Enhanced CSP (30 min)

### Step 1: Create CSP Helper (10 min)

- **File:** `/src/lib/security/csp.ts` (create new file)
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 3
- **Lines:** 1-100

### Step 2: Update next.config.ts (10 min)

- **File:** `/next.config.ts`
- Replace CSP section with new implementation
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 3
- **Lines:** 105-165

### Step 3: Create CSP Report Endpoint (5 min)

- **File:** `/src/app/api/csp-report/route.ts`
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 3
- **Lines:** 170-210

### Step 4: Test & Deploy (5 min)

```bash
npm run build
npm start
# Check console for CSP violations
```

---

## Feature 4: Enhanced Audit Logging (2 hours)

### Step 1: Create Enhanced Audit Manager (45 min)

- **File:** `/src/lib/audit-enhanced.ts`
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 4
- **Lines:** 1-550

### Step 2: Update Critical Endpoints (1 hour)

**Priority locations:**

1. **Authentication** (`/src/lib/auth.ts`):
   - Add login success/failure logging
   - Add password change logging

2. **Budget Approvals** (`/src/app/api/budgets/[id]/route.ts`):
   - Add approval logging

3. **Settings Changes** (`/src/app/api/admin/api-keys/route.ts`):
   - Add API key creation logging

4. **Role Changes** (`/src/app/api/admin/users/[id]/route.ts`):
   - Add role change logging

**Example:**
```typescript
import { audit } from '@/lib/audit-enhanced'

export async function POST(request: NextRequest) {
  const context = audit.getContextFromRequest(request, session.user.id)

  try {
    // Your logic...
    await audit.logLoginSuccess(user.id, context)
  } catch (error) {
    await audit.logLoginFailure(email, error.message, context)
  }
}
```

### Step 3: Create Audit Viewer API (10 min)

- **File:** `/src/app/api/audit-logs/route.ts`
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 4
- **Lines:** 555-600

### Step 4: Test (5 min)

```bash
# View audit logs (admin only)
curl http://localhost:3000/api/audit-logs?limit=10 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Feature 5: Database Connection Pooling (1 hour)

### Step 1: Get PgBouncer URL from Railway (10 min)

1. Open Railway dashboard
2. Go to PostgreSQL service
3. Click "Connect"
4. Copy "Pooled Connection" URL
5. Update `.env`:
   ```bash
   DATABASE_URL="postgresql://user:pass@pooler-xyz.railway.internal:5432/railway?sslmode=require"
   DATABASE_POOL_MAX=10
   ```

### Step 2: Create Optimized Prisma Client (20 min)

- **File:** `/src/lib/prisma-optimized.ts`
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 5
- **Lines:** 1-200

### Step 3: Update Imports (15 min)

Replace imports across codebase:
```typescript
// Old
import { prisma } from '@/lib/prisma'

// New
import { prisma } from '@/lib/prisma-optimized'
```

**Files to update:**
- All `/src/app/api/**/route.ts` files
- `/src/lib/audit.ts`
- Any other files importing prisma

### Step 4: Create Health Check (10 min)

- **File:** `/src/app/api/health/database/route.ts`
- **Copy from:** `ENTERPRISE_SECURITY_IMPLEMENTATION.md` section 5
- **Lines:** 205-245

### Step 5: Test & Monitor (5 min)

```bash
# Test database health
curl http://localhost:3000/api/health/database

# Expected:
# {
#   "status": "healthy",
#   "database": { "healthy": true, "latency": 15 }
# }
```

---

## Deployment Steps

### 1. Update Railway Environment Variables

```bash
# Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# CORS
NEXTAUTH_URL=https://your-app.railway.app
ALLOWED_ORIGINS=https://dashboard.example.com

# Database
DATABASE_URL=postgresql://user:pass@pooler-xyz.railway.internal:5432/railway?sslmode=require
DATABASE_POOL_MAX=10

# Optional
CSP_REPORT_URI=/api/csp-report
RATE_LIMIT_ANALYTICS=true
```

### 2. Build & Test Locally

```bash
npm run build
npm start

# Test each feature
npm run test
```

### 3. Deploy to Railway

```bash
git add .
git commit -m "feat: Add enterprise security features"
git push origin main
```

### 4. Verify Production

```bash
# Test rate limiting
curl https://your-app.railway.app/api/health

# Check logs
railway logs
```

---

## Monitoring Setup (Post-deployment)

### 1. Set Up Uptime Monitoring

- Use UptimeRobot or similar
- Monitor endpoints:
  - `/api/health`
  - `/api/health/database`
  - `/api/tenders` (sample API)

### 2. Configure Alerts

**Critical Alerts:**
- Database connection failures
- Rate limit violations (>100/hour)
- CSP violations (new patterns)
- Failed login attempts (>10/hour)

**Warning Alerts:**
- Database latency >1000ms
- Connection pool >80% full
- Audit log failures

### 3. Set Up Dashboards

**Key Metrics:**
- Request rate per endpoint
- Rate limit hit rate
- Database connection pool usage
- Audit log volume
- Error rates

---

## Rollback Plan

If issues arise:

### 1. Rate Limiting
```bash
# Remove from environment variables
unset UPSTASH_REDIS_REST_URL
unset UPSTASH_REDIS_REST_TOKEN

# Code will fall back to in-memory rate limiting
```

### 2. CORS Middleware
```bash
# Delete src/middleware.ts
# Redeploy
```

### 3. Database Pooling
```bash
# Switch back to direct connection
DATABASE_URL=postgresql://user:pass@host:5432/railway?sslmode=require

# Revert imports to original prisma client
```

---

## Testing Checklist

- [ ] Rate limiting works on auth endpoints
- [ ] Rate limiting works on AI endpoints
- [ ] CORS allows configured origins
- [ ] CORS blocks unauthorized origins
- [ ] CSP headers present in responses
- [ ] CSP violations logged
- [ ] Login success logged
- [ ] Login failure logged
- [ ] Budget approval logged
- [ ] Database health check passes
- [ ] Database connection pooling active
- [ ] No performance degradation
- [ ] All tests pass
- [ ] Production deployment successful

---

## Success Metrics

**After 1 Week:**
- [ ] Zero rate limit false positives
- [ ] <5% rate limit violations
- [ ] Zero CORS errors
- [ ] <10 CSP violations/day
- [ ] 100% audit log coverage for critical operations
- [ ] Database latency <100ms (p95)
- [ ] Connection pool usage <70%

**After 1 Month:**
- [ ] Security incident response time <1 hour
- [ ] Audit log analysis completed
- [ ] Performance baseline established
- [ ] Team trained on new features

---

## Troubleshooting

### Rate Limiting Issues

**Problem:** Rate limit triggered incorrectly
**Solution:**
```typescript
// Check identifier
const identifier = getIdentifier(request, userId)
console.log('Rate limit identifier:', identifier)

// Increase limit temporarily
const rateLimitResponse = await rateLimit(
  request,
  rateLimiters.perMinute(200) // Higher limit
)
```

### CORS Issues

**Problem:** Request blocked by CORS
**Solution:**
1. Check origin is in ALLOWED_ORIGINS
2. Verify middleware.ts config matcher
3. Check preflight response headers

### Database Connection Issues

**Problem:** Too many connections
**Solution:**
```bash
# Reduce pool size
DATABASE_POOL_MAX=5

# Or use direct connection temporarily
DATABASE_URL=postgresql://user:pass@direct-host:5432/railway
```

### Audit Log Issues

**Problem:** Logs not appearing
**Solution:**
1. Check Prisma client connection
2. Verify user ID is passed
3. Check audit.log() is awaited
4. Review database constraints

---

## Quick Links

- **Full Documentation:** `/ENTERPRISE_SECURITY_IMPLEMENTATION.md`
- **Upstash Dashboard:** https://console.upstash.com
- **Railway Dashboard:** https://railway.app
- **Next.js Middleware Docs:** https://nextjs.org/docs/app/building-your-application/routing/middleware
- **Prisma Connection Pool:** https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

---

## Support

**Questions?** Check the full implementation guide in `ENTERPRISE_SECURITY_IMPLEMENTATION.md`

**Issues?** Create a GitHub issue with:
- Feature name
- Error message
- Environment (dev/production)
- Steps to reproduce

---

**Total Time Estimate:** 8-10 hours
**Difficulty:** Medium
**Impact:** High

✅ **Ready to implement!**
