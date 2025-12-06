# 🚀 Quick Deploy Guide

**Deploy Dashboard2 to production in 3 steps:**

## Step 1: Create Neon Database (5 minutes)

1. Go to [console.neon.tech](https://console.neon.tech)
2. Sign up with GitHub
3. Create new project: `dashboard2-production`
4. Copy the connection string (looks like `postgresql://...`)

## Step 2: Deploy to Vercel (5 minutes)

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New..." → "Project"
4. Import your `Dashboard2` repository
5. Add environment variables:
   - `DATABASE_URL` = Your Neon connection string
   - `NEXTAUTH_SECRET` = Run `openssl rand -base64 32` and paste result
6. Click "Deploy"
7. After deployment, add one more variable:
   - `NEXTAUTH_URL` = Your Vercel URL (e.g., `https://dashboard2-xyz.vercel.app`)
8. Redeploy

## Step 3: Seed Database (2 minutes)

On your local machine:

```bash
# Set your production database URL
export DATABASE_URL="your_neon_connection_string"

# Run the seed script
node scripts/seed-production.js
```

## Done! 🎉

Visit your Vercel URL and log in:
- **Email:** admin@beshara.com
- **Password:** admin123

**⚠️ Change the password immediately after first login!**

---

## Need More Details?

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for the complete guide with screenshots and troubleshooting.

See [ENV_VARIABLES_CHECKLIST.md](./ENV_VARIABLES_CHECKLIST.md) for optional features (AI, email, etc.).
