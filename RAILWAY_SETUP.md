# Railway Deployment Setup Guide

## Quick Start (5 minutes)

### 1. Create Railway Project

1. Go to [Railway.app](https://railway.app) and create a new project
2. Click "Add Service" → "Database" → "PostgreSQL"
3. Click "Add Service" → "GitHub Repo" → Select this repository

### 2. Set Environment Variables ⭐ IMPORTANT

In your Railway project dashboard, go to your app service → Variables tab and add:

**Required Variables:**

```bash
# Authentication (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=<paste-your-generated-secret>

# Your Railway app URL
NEXTAUTH_URL=https://your-app.railway.app

# Database (auto-populated by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Recommended: AI Provider Keys (Environment Variables > Database Storage)**

```bash
# Google Gemini (primary AI provider)
GEMINI_API_KEY=your-actual-gemini-api-key

# Groq (fallback AI provider)
GROQ_API_KEY=your-actual-groq-api-key

# Optional: OpenAI fallback
OPENAI_API_KEY=your-openai-key
```

**Why use environment variables for API keys?**

- ✅ More secure (no database storage)
- ✅ Railway manages encryption
- ✅ Easy rotation without code changes
- ✅ Same setup across all environments
- ✅ See `API_KEY_ENVIRONMENT_PRIORITY.md` for details

### 3. Add PostgreSQL Reference

Make sure `DATABASE_URL` is set to reference your PostgreSQL service:

- Click on your app service
- Go to Variables tab
- Add new variable: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`

### 4. Deploy

Railway will automatically deploy when you:

- Push to your GitHub repository (if connected)
- Or click "Deploy" in the Railway dashboard

### 5. Run Initial Migration

After first deployment, open the service logs and verify:

- ✅ "Environment variables validated"
- ✅ "Starting server on 0.0.0.0:PORT"
- ✅ No Prisma migration errors

If migrations fail, run manually in Railway CLI:

```bash
railway run npx prisma migrate deploy
```

## Troubleshooting

### "Missing required environment variables"

- Check all three required variables are set: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Verify `DATABASE_URL` references PostgreSQL service: `${{Postgres.DATABASE_URL}}`

### "Standalone build not found"

- Check build logs to see if `npm run build` completed successfully
- Verify `next.config.ts` has `output: "standalone"`

### Database connection errors

- Verify PostgreSQL service is running
- Check DATABASE_URL is correctly formatted
- Ensure Prisma migrations ran successfully

### Build timeouts

- Upgrade Railway plan for more build resources
- Check for large dependencies that might cause timeouts

## Optional: Add Redis for Caching

1. Click "Add Service" → "Database" → "Redis"
2. Add variable: `REDIS_URL` = `${{Redis.REDIS_URL}}`

## Optional: Add AI Services

For tender extraction features, add:

```bash
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
```

## Optional: Add AWS S3 for File Storage

```bash
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
```

## Monitoring

- View logs: Railway dashboard → Your service → Logs
- View metrics: Railway dashboard → Your service → Metrics
- Set up alerts: Railway dashboard → Settings → Notifications

## Updates

Railway auto-deploys on git push when connected to GitHub. Or manually:

```bash
railway up
```
