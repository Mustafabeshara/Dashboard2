# 🚀 Medical Distribution Management System - Deployment Guide

Complete deployment guide for your hybrid desktop/web application with multiple deployment options.

---

## 🎯 Architecture Overview

Your application uses a **hybrid architecture** with multiple deployment options:

### **Option A: Desktop Application (Recommended)**
- **Framework**: Nextron (Next.js + Electron)
- **Database**: Local SQLite database
- **Deployment**: Native desktop apps (.dmg, .exe, .AppImage)
- **Best for**: Enterprise users, offline-first scenarios

### **Option B: Web Application**
- **Framework**: Next.js with static export
- **Database**: PostgreSQL (Railway/Supabase/Vercel)
- **Deployment**: Vercel, Netlify, Railway, or any static host
- **Best for**: Cloud deployment, multi-user access

### **Option C: Hybrid Deployment**
- **Both desktop and web** deployments available
- **Users choose** their preferred experience
- **Maximum flexibility** for different use cases

---

## 📋 Prerequisites

- Node.js 20.9.0+ installed
- Git repository access
- For web deployment: Cloud platform account (Vercel/Netlify/Railway)
- For desktop: Build machine for target platforms

---

## 🎯 Choose Your Deployment Strategy

### Quick Decision Guide:

| Scenario | Recommended | Why |
|----------|-------------|-----|
| **Enterprise Software** | Desktop App | Offline-first, native experience, easy distribution |
| **SaaS/Web App** | Web App | Multi-user, cloud sync, easy updates |
| **Internal Tools** | Desktop App | Local data, performance, security |
| **Customer-Facing** | Web App | Accessibility, cross-platform, maintenance |
| **Maximum Flexibility** | Hybrid | Both options available |

---

## 🖥️ Option 1: Desktop Application Deployment (Recommended)

### Step 1: Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL database service
4. Add Redis service (optional, for caching)

### Step 2: Configure Environment Variables

In your Railway project dashboard, add these environment variables:

```bash
# Database (Railway provides this automatically)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (Railway provides this if you add Redis service)
REDIS_URL=${{Redis.REDIS_URL}}

# NextAuth
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=generate-random-secret-here  # Use: openssl rand -base64 32

# AWS S3 (Document Storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# AI Services
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# OCR (Optional - choose one)
# Option 1: AWS Textract (uses AWS credentials above)
# Option 2: Google Vision AI
GOOGLE_VISION_API_KEY=your_vision_api_key

# Email Notifications
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # Gmail app password

# Node Environment
NODE_ENV=production
```

### Step 3: Deploy to Railway

**Option A: Using Railway CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

**Option B: Using GitHub Integration**

1. Push your code to GitHub
2. In Railway dashboard, connect your GitHub repository
3. Railway will automatically deploy on every push to main branch

### Step 4: Run Database Migrations

After deployment, run migrations:

```bash
railway run npx prisma migrate deploy
```

Or use the Railway dashboard to run this command.

### Step 5: Seed Database (Optional)

```bash
railway run npx prisma db seed
```

This creates sample data for testing.

---

## Part 2: Electron Desktop App

### Development Mode

```bash
# Install dependencies
npm install

# Start Next.js dev server and Electron
npm run electron:dev
```

The Electron app will:
- Start the Next.js development server automatically
- Create a local SQLite database at `~/Library/Application Support/medical-distribution-dashboard/`
- Open the desktop application window
- Enable offline mode with local data storage

### Building for Production

**Build for macOS:**

```bash
npm run electron:build:mac
```

**Build for Windows:**

```bash
npm run electron:build:win
```

**Build for Linux:**

```bash
npm run electron:build:linux
```

The built applications will be in the `dist/` directory.

### Electron Features

- **Local Database**: SQLite database for offline functionality
- **Automatic Sync**: Syncs with Railway backend when online
- **System Tray**: Minimizes to system tray
- **Auto Updates**: Checks for updates automatically (if configured)
- **Native Menus**: Platform-specific application menus

---

## Environment Variables

### For Electron Desktop App

Create `.env.local` file:

```bash
# Railway Backend API
NEXT_PUBLIC_API_URL=https://your-app.railway.app

# Local database path (optional, defaults to user data directory)
LOCAL_DATABASE_PATH=

# Enable offline mode
NEXT_PUBLIC_OFFLINE_MODE=true
```

### For Railway Backend

See Part 1, Step 2 above.

---

## Database Setup

### Railway PostgreSQL

Railway automatically provisions a PostgreSQL database. The connection string is available as `${{Postgres.DATABASE_URL}}`.

### Local SQLite (Electron)

The Electron app automatically creates a local SQLite database at:
- **macOS**: `~/Library/Application Support/medical-distribution-dashboard/database.db`
- **Windows**: `%APPDATA%/medical-distribution-dashboard/database.db`
- **Linux**: `~/.config/medical-distribution-dashboard/database.db`

### Database Migrations

Migrations are automatically run on Railway deployment. For local development:

```bash
npx prisma migrate dev
```

---

## AWS S3 Setup

### Create S3 Bucket

1. Go to AWS Console > S3
2. Create new bucket (e.g., `dashboard2-documents`)
3. Enable versioning (recommended)
4. Configure CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### Create IAM User

1. Go to IAM > Users > Create User
2. Attach policy: `AmazonS3FullAccess`
3. Generate access keys
4. Add keys to Railway environment variables

---

## Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account > Security
   - 2-Step Verification > App passwords
   - Generate password for "Mail"
3. Use the generated password in `EMAIL_PASSWORD`

---

## Production Checklist

### Security

- [ ] Change all default passwords
- [ ] Generate strong `NEXTAUTH_SECRET`
- [ ] Enable HTTPS on Railway (automatic)
- [ ] Configure CORS properly
- [ ] Review and restrict API access
- [ ] Enable Railway's built-in DDoS protection

### Performance

- [ ] Enable Redis caching on Railway
- [ ] Configure proper caching headers
- [ ] Optimize database indexes
- [ ] Enable gzip compression (Railway default)

### Monitoring

- [ ] Set up Railway's built-in monitoring
- [ ] Configure error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set up database backups (Railway automatic)

### Testing

- [ ] Test Electron app on all target platforms
- [ ] Test offline mode functionality
- [ ] Test sync between local and Railway backend
- [ ] Test all API endpoints
- [ ] Test file uploads to S3
- [ ] Test email notifications
- [ ] Test AI extraction

---

## Scheduled Tasks

Railway supports cron jobs. Create a cron service in Railway:

### Email Reminders

```bash
# Run every day at 9 AM
0 9 * * * curl https://your-app.railway.app/api/cron/email-reminders
```

### Budget Alerts

```bash
# Run every hour
0 * * * * curl https://your-app.railway.app/api/cron/budget-alerts
```

---

## Backup Strategy

### Railway PostgreSQL Backups

Railway automatically backs up your PostgreSQL database daily. You can also:

```bash
# Manual backup
railway run pg_dump > backup_$(date +%Y%m%d).sql

# Restore from backup
railway run psql < backup_20241130.sql
```

### Local Database Backups

The Electron app automatically creates backups of the local SQLite database in:
- `~/Library/Application Support/medical-distribution-dashboard/backups/`

---

## Troubleshooting

### Railway Deployment Issues

```bash
# View logs
railway logs

# Restart service
railway restart

# Run migrations manually
railway run npx prisma migrate deploy
```

### Electron Build Issues

```bash
# Clear Electron cache
rm -rf node_modules/.cache/electron

# Rebuild native modules
npm rebuild

# Clear Next.js cache
rm -rf .next
```

### Database Connection Issues

```bash
# Test Railway database connection
railway run npx prisma db pull

# Check local database
ls -lh ~/Library/Application\ Support/medical-distribution-dashboard/
```

---

## Scaling

### Railway Scaling

1. Railway automatically scales based on traffic
2. Upgrade to Pro plan for more resources
3. Add read replicas for database (Pro plan)
4. Use Railway's built-in CDN

### Electron Distribution

1. Use electron-builder for code signing
2. Set up auto-update server
3. Distribute via:
   - Direct download from website
   - Mac App Store
   - Windows Store
   - Snap Store (Linux)

---

## Updating the Application

### Backend Updates (Railway)

Railway automatically deploys when you push to GitHub (if connected).

Or manually:

```bash
railway up
```

### Desktop App Updates

1. Build new version with incremented version number
2. Upload to distribution server
3. Electron auto-updater will notify users
4. Users can update from within the app

---

## Support

For issues and questions:
- GitHub Issues: [repository-url]
- Email: support@dashboard2.com
- Railway Support: https://railway.app/help

---

## License

Proprietary - All rights reserved
