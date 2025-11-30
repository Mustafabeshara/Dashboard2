# Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at https://railway.app
2. **Railway CLI**: Install the Railway CLI
   ```bash
   npm install -g @railway/cli
   ```
3. **GitHub Repository**: Your code is already pushed to GitHub

## Quick Deployment Commands

### 1. Login to Railway
```bash
railway login
```

### 2. Initialize Railway Project
```bash
cd /path/to/Dashboard2
railway init
```

### 3. Link to GitHub Repository
```bash
railway link
```

### 4. Add PostgreSQL Database
```bash
railway add --database postgresql
```

### 5. Set Environment Variables
```bash
# Database (automatically set by Railway)
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}

# NextAuth
railway variables set NEXTAUTH_URL=https://your-app.railway.app
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)

# AI Providers
railway variables set GROQ_API_KEY=your_groq_api_key
railway variables set GOOGLE_AI_API_KEY=your_google_ai_api_key

# AWS S3 (for file storage)
railway variables set AWS_ACCESS_KEY_ID=your_aws_access_key
railway variables set AWS_SECRET_ACCESS_KEY=your_aws_secret_key
railway variables set AWS_REGION=us-east-1
railway variables set AWS_S3_BUCKET=your-bucket-name

# Email (optional)
railway variables set EMAIL_USER=your_email@gmail.com
railway variables set EMAIL_PASSWORD=your_app_password

# OCR (optional)
railway variables set AWS_TEXTRACT_ENABLED=false
railway variables set GOOGLE_VISION_API_KEY=your_google_vision_key

# Cron Secret
railway variables set CRON_SECRET=$(openssl rand -base64 32)
```

### 6. Deploy
```bash
railway up
```

### 7. Run Database Migrations
```bash
railway run npx prisma migrate deploy
railway run npx prisma generate
railway run npx prisma db seed
```

### 8. Open Your Application
```bash
railway open
```

## Alternative: Deploy via Railway Dashboard

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Choose your `Dashboard2` repository
4. Railway will auto-detect Next.js and configure build settings
5. Add PostgreSQL database from the dashboard
6. Set environment variables in the dashboard
7. Deploy!

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set by Railway |
| `NEXTAUTH_URL` | Your app URL | `https://your-app.railway.app` |
| `NEXTAUTH_SECRET` | NextAuth secret key | Generate with `openssl rand -base64 32` |
| `GROQ_API_KEY` | Groq AI API key | Get from https://console.groq.com |
| `GOOGLE_AI_API_KEY` | Google Gemini API key | Get from https://makersuite.google.com |
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 | From AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | From AWS IAM |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_S3_BUCKET` | S3 bucket name | `your-bucket-name` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EMAIL_USER` | Email for notifications | - |
| `EMAIL_PASSWORD` | Email app password | - |
| `AWS_TEXTRACT_ENABLED` | Enable OCR | `false` |
| `GOOGLE_VISION_API_KEY` | Google Vision API | - |
| `REDIS_URL` | Redis connection string | Uses in-memory cache |
| `CRON_SECRET` | Secret for cron endpoints | Generate with `openssl rand -base64 32` |

## Post-Deployment Setup

### 1. Set Up Cron Jobs

Railway doesn't have built-in cron support. Use one of these options:

**Option A: Use a cron service (Recommended)**
- Sign up for https://cron-job.org or https://easycron.com
- Add a job to call: `https://your-app.railway.app/api/cron/reminders`
- Schedule: Every hour
- Add header: `Authorization: Bearer YOUR_CRON_SECRET`

**Option B: Use Railway's built-in scheduler (if available)**
```bash
railway run --cron "0 * * * *" "curl -H 'Authorization: Bearer $CRON_SECRET' https://your-app.railway.app/api/cron/reminders"
```

### 2. Configure S3 Bucket

1. Create an S3 bucket in AWS
2. Set bucket policy to allow public read access (for document URLs)
3. Enable CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-app.railway.app"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 3. Set Up Email

For Gmail:
1. Enable 2-factor authentication
2. Generate an app password: https://myaccount.google.com/apppasswords
3. Use the app password in `EMAIL_PASSWORD`

### 4. Create First User

After deployment, create your first admin user:
```bash
railway run npx prisma studio
```

Or use the API:
```bash
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "fullName": "Admin User",
    "role": "ADMIN"
  }'
```

## Monitoring and Logs

### View Logs
```bash
railway logs
```

### Monitor Performance
```bash
railway status
```

### Access Database
```bash
railway run npx prisma studio
```

## Troubleshooting

### Build Fails

1. Check build logs: `railway logs`
2. Verify all dependencies are in `package.json`
3. Ensure `prisma generate` runs in build script

### Database Connection Issues

1. Verify `DATABASE_URL` is set: `railway variables`
2. Check database is running: `railway status`
3. Run migrations: `railway run npx prisma migrate deploy`

### Environment Variables Not Working

1. List all variables: `railway variables`
2. Restart the service: `railway restart`
3. Redeploy: `railway up --detach`

## Scaling

### Vertical Scaling
Railway automatically scales based on your plan. Upgrade in the dashboard.

### Horizontal Scaling
For high traffic:
1. Enable Redis for caching
2. Use CDN for static assets
3. Consider separating API and frontend

## Cost Optimization

1. **Free Tier**: Railway offers $5/month free credit
2. **Database**: PostgreSQL is included
3. **Bandwidth**: Monitor usage in dashboard
4. **Sleep Mode**: Disable for production apps

## Security Checklist

- [ ] All environment variables are set
- [ ] `NEXTAUTH_SECRET` is strong and unique
- [ ] Database credentials are secure
- [ ] S3 bucket has proper access controls
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled
- [ ] Audit logging is active

## Backup Strategy

### Database Backups
```bash
# Manual backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore
railway run psql $DATABASE_URL < backup.sql
```

### Automated Backups
Railway provides automatic daily backups on paid plans.

## CI/CD Integration

Railway automatically deploys on git push. To customize:

1. Create `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

2. Push to GitHub:
```bash
git add railway.toml
git commit -m "Add Railway configuration"
git push origin main
```

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Dashboard2 Issues: https://github.com/Mustafabeshara/Dashboard2/issues

## Quick Reference

```bash
# Login
railway login

# Deploy
railway up

# Logs
railway logs

# Variables
railway variables

# Run command
railway run <command>

# Open app
railway open

# Restart
railway restart
```

---

**Ready to deploy?** Run these commands:

```bash
railway login
railway init
railway add --database postgresql
railway up
railway run npx prisma migrate deploy
railway run npx prisma db seed
railway open
```

Your Dashboard2 application will be live in minutes! 🚀
