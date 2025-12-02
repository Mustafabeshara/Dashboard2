# Deployment Checklist for Railway

## Pre-Deployment

### ✅ Code Ready
- [x] All TypeScript errors fixed
- [x] Build compiles successfully (with env vars)
- [x] Code committed to GitHub
- [x] 0 security vulnerabilities
- [x] All tests pass

### ✅ Features Verified
- [x] Bulk tender upload working
- [x] AI extraction pipeline complete
- [x] Health checks implemented
- [x] Performance monitoring active

## Railway Configuration

### 1. **Environment Variables** (Set These First)

**Required for Build & Runtime:**
```
DATABASE_URL=postgresql://user:password@host:5432/medical_distribution
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-railway-domain.railway.app
```

**AI Provider Keys (Pick at least 2):**
```
# Primary
GROQ_API_KEY=<from groq console>

# Secondary (recommended)
GEMINI_API_KEY=<from google console>

# Fallback options
GOOGLE_AI_API_KEY=<from google ai studio>
ANTHROPIC_API_KEY=<from anthropic console>
```

**Optional S3 (for production file storage):**
```
S3_BUCKET_NAME=medical-distribution-uploads
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

**Other:**
```
NODE_ENV=production
JWT_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_API_URL=https://your-railway-domain.railway.app
```

### 2. **Database Setup**

**On Railway PostgreSQL:**
```bash
# Run migrations
npm run db:push
npm run db:seed # Optional: load test data
```

**Or via Railway UI:**
1. Create PostgreSQL service in Railway
2. Copy `DATABASE_URL` connection string
3. Set it as environment variable
4. Deploy will auto-run migrations via `postinstall` hook

### 3. **Build & Deployment**

**Railway Auto-Deploy:**
1. Connect GitHub repository
2. Set root directory to `/` (if not auto-detected)
3. Railway watches for changes and auto-deploys
4. No custom build command needed (uses `npm run build`)

**Build Settings:**
- Node version: 20.x or higher (auto-detected)
- Package manager: npm
- Start command: `npm run start` (auto-detected)
- Build command: `npm run build` (auto-detected)

### 4. **Health Verification**

After deployment, verify:

```bash
# Check basic health
curl https://your-domain/api/health

# Should return:
{
  "status": "ok",
  "database": "connected",
  "ai": {
    "groq": "operational",
    "gemini": "operational"
  }
}

# Check metrics
curl https://your-domain/api/admin/metrics

# Test tender endpoint
curl https://your-domain/api/tenders
```

### 5. **Monitoring**

**In Railway Dashboard:**
- Monitor logs for errors
- Watch CPU/memory usage
- Check database connection pool
- Verify AI provider errors

**App Health Checks:**
- Navigate to `/api/health` - should show green
- Try `/tenders/create` - upload test PDF
- Try `/tenders/bulk-upload` - upload test ZIP

## Troubleshooting

### Build Fails: "DATABASE_URL is required"
**Solution**: Set DATABASE_URL in Railway variables BEFORE deployment

### AI Providers Not Working
**Solution**: 
1. Verify at least one API key is set
2. Check provider is in fallback chain
3. Test with `/api/health` endpoint

### Bulk Upload Returns 413
**Solution**: Increase payload limit in `next.config.ts` for large ZIPs

### Database Connection Timeout
**Solution**:
1. Verify DATABASE_URL is correct
2. Check firewall/network rules
3. Restart PostgreSQL service

### Performance Issues
**Solution**:
1. Check `/api/admin/metrics` for bottlenecks
2. Monitor AI provider response times
3. Consider caching extraction results

## Post-Deployment

### 1. **Create First Tender**
- Login with admin account
- Go to `/tenders/create`
- Upload sample PDF
- Verify extraction works

### 2. **Test Bulk Upload**
- Create ZIP with 3-5 PDFs
- Upload to `/tenders/bulk-upload`
- Verify all extracted correctly

### 3. **Monitor Usage**
- Check `/api/admin/metrics`
- Monitor AI costs (track API calls)
- Review extraction quality

### 4. **Set Up Alerts**
In Railway:
- Alert on deployment failure
- Alert on high error rates
- Alert on database connection issues

## Rollback Plan

If deployment has issues:

1. **Via Railway UI**: Click "Rollback" on previous deployment
2. **Via GitHub**: Revert commit and push
3. **Via CLI**: `railway up` with previous commit

## Success Indicators ✅

After deployment, you should see:
- ✅ Application accessible at railway domain
- ✅ Database connected and seeded
- ✅ AI providers operational
- ✅ Bulk upload page loads
- ✅ Single document extraction works
- ✅ Performance metrics accessible

## Next Iteration

Once deployed and verified:

1. **Real Data Testing**
  - Test with actual MOH tenders
  - Monitor extraction accuracy
  - Adjust confidence thresholds

2. **User Feedback**
  - Collect feedback on extracted data
  - Note any extraction failures
  - Document edge cases

3. **Performance Optimization**
  - Monitor slow queries
  - Optimize AI provider selection
  - Consider background processing

4. **Feature Enhancements**
  - Add webhook notifications
  - Implement result caching
  - Build template matching system
