# Environment Variables Checklist for Vercel Deployment

## Required Variables (Must Set)

These variables are **absolutely required** for the application to function:

### ✅ Database
- [ ] `DATABASE_URL` - Your Neon PostgreSQL connection string
  - Get from: [Neon Console](https://console.neon.tech)
  - Format: `postgresql://user:pass@host/db?sslmode=require`

### ✅ Authentication
- [ ] `NEXTAUTH_SECRET` - Secret key for JWT encryption (min 32 characters)
  - Generate: `openssl rand -base64 32`
  - Or use: [Generate Secret](https://generate-secret.vercel.app/32)

- [ ] `NEXTAUTH_URL` - Your production URL
  - Will be: `https://your-project-name.vercel.app`
  - Set this **after** first deployment when you know your URL

---

## Optional Variables (Enable Features)

These variables enable additional features but are not required for basic functionality:

### 🤖 AI Features (Document Processing & Analysis)
- [ ] `GEMINI_API_KEY` - Google Gemini for AI processing
- [ ] `GROQ_API_KEY` - Groq for fast LLM inference
- [ ] `GOOGLE_AI_API_KEY` - Google AI services
- [ ] `ANTHROPIC_API_KEY` - Claude AI (fallback)

**When to set:** If you want AI-powered tender extraction and budget forecasting

### ☁️ AWS Services (File Storage & OCR)
- [ ] `AWS_ACCESS_KEY_ID` - AWS credentials
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS credentials
- [ ] `AWS_REGION` - AWS region (e.g., `us-east-1`)
- [ ] `AWS_S3_BUCKET` - S3 bucket name for uploads

**When to set:** If you want file uploads and OCR capabilities

### 📧 Email Notifications
- [ ] `SMTP_HOST` - SMTP server (e.g., `smtp.gmail.com`)
- [ ] `SMTP_PORT` - SMTP port (usually `587`)
- [ ] `SMTP_USER` - Email username
- [ ] `SMTP_PASSWORD` - Email password or app password
- [ ] `SMTP_FROM` - From email address

**When to set:** If you want email notifications for approvals and alerts

### 🚀 Performance & Monitoring
- [ ] `REDIS_URL` - Redis connection string (for caching)
- [ ] `SENTRY_DSN` - Sentry error tracking

**When to set:** For production optimization and error monitoring

---

## How to Set in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Your actual value
   - **Environment**: Select `Production`, `Preview`, and `Development` as needed
4. Click **Save**

---

## Quick Start (Minimum Setup)

To get started quickly, you only need these **3 variables**:

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=https://your-app.vercel.app
```

Everything else can be added later as you need those features!

---

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit** `.env` files with real values to Git
2. **Use Vercel Dashboard** to set environment variables, not `.env` files in production
3. **Rotate secrets** regularly, especially `NEXTAUTH_SECRET`
4. **Use different values** for Production, Preview, and Development environments
5. **Limit AWS permissions** to only what's needed (S3 upload, Textract read)
6. **Use app passwords** for SMTP, not your main email password

---

## Testing Your Setup

After setting variables in Vercel:

1. Trigger a new deployment (push to GitHub or click "Redeploy")
2. Check deployment logs for any missing variable errors
3. Visit your app URL and try to log in
4. Check Vercel **Runtime Logs** for any connection issues

---

## Troubleshooting

### "DATABASE_URL is not defined"
- Make sure you set it in Vercel Dashboard
- Check that you selected the correct environment (Production)
- Redeploy after adding the variable

### "NEXTAUTH_SECRET is not defined"
- Generate a new secret: `openssl rand -base64 32`
- Add it to Vercel Dashboard
- Must be at least 32 characters

### "Failed to connect to database"
- Verify your Neon database is running
- Check the connection string format
- Ensure `?sslmode=require` is at the end
- Test connection from Neon Console

### "Build failed: Prisma migration error"
- Your database might be empty
- Migrations will run automatically during build
- Check build logs for specific Prisma errors
