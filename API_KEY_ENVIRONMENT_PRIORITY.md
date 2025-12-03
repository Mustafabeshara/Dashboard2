# API Key Management - Environment Variables Priority

**Updated:** December 3, 2025  
**Priority:** Environment Variables First (Railway/Vercel Recommended)

---

## Overview

The application now **prioritizes environment variables** over database storage for API keys. This follows best practices for production deployments on Railway, Vercel, and other cloud platforms.

### Priority Order

1. **Environment Variables** (Highest Priority) ✅ Recommended

   - Set on Railway/Vercel dashboard
   - Most secure (no database storage needed)
   - Automatically available to application
   - Cannot be edited through UI

2. **Database Storage** (Fallback)
   - Keys saved through Settings page
   - Encrypted with AES-256-GCM
   - Useful for local development/desktop mode
   - Can be edited/deleted through UI

---

## Railway Setup (Production)

### 1. Access Environment Variables

```
Railway Dashboard → Your Project → Variables Tab
```

### 2. Add API Keys

```bash
# AI Providers
GEMINI_API_KEY=your-actual-gemini-key-here
GROQ_API_KEY=your-actual-groq-key-here
OPENAI_API_KEY=your-openai-key-here  # Optional fallback

# AWS (for OCR)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

### 3. Deploy

Railway automatically restarts your application with the new variables.

---

## Vercel Setup (Alternative)

### 1. Access Environment Variables

```
Vercel Dashboard → Your Project → Settings → Environment Variables
```

### 2. Add Variables

Same as Railway (above)

### 3. Redeploy

Vercel will use the new environment variables on next deployment.

---

## Local Development

### Option A: Environment Variables (.env file)

```bash
# Create .env file
cp .env.example .env

# Edit with your keys
nano .env
```

Add:

```env
GEMINI_API_KEY=your-key-here
GROQ_API_KEY=your-key-here
```

### Option B: Database Storage (Settings Page)

1. Start application: `npm run dev`
2. Go to Settings → Integrations
3. Add keys through UI (encrypted automatically)

---

## How It Works

### Code Implementation

**File:** `src/lib/ai/api-keys.ts`

```typescript
export async function getApiKey(keyName: string): Promise<string | null> {
  // PRIORITY 1: Check environment variable first
  const envValue = process.env[keyName];
  if (envValue && isValidKey(envValue)) {
    return envValue;
  }

  // PRIORITY 2: Fall back to database
  const dbValue = await loadFromDatabase(keyName);
  if (dbValue && isValidKey(dbValue)) {
    return dbValue;
  }

  return null;
}
```

### Settings Page UI

**File:** `src/app/(dashboard)/settings/page.tsx`

The Settings page now shows:

- **Blue badge "From ENV"** - Key loaded from environment variables (read-only)
- **Green badge "Saved"** - Key stored in database (can edit/delete)
- **Notice banner** - Shows how many keys are from environment

---

## Security Benefits

### Environment Variables ✅

- ✅ **No database exposure** - Keys never stored in database
- ✅ **Platform-managed** - Railway/Vercel handle encryption
- ✅ **Easy rotation** - Update in dashboard, redeploy
- ✅ **No code changes** - Same across all environments
- ✅ **Audit logs** - Cloud platforms track changes

### Database Storage ⚠️

- ⚠️ **Requires encryption** - AES-256-GCM implemented
- ⚠️ **Database backups** - Keys in backups (encrypted)
- ⚠️ **UI exposure** - Admin users can view masked keys
- ⚠️ **Rotation harder** - Must update through UI

---

## Testing

### Verify Environment Variables Are Used

```bash
# Check Settings page
1. Login to application
2. Go to Settings → Integrations
3. Look for "From ENV" badges
4. Should see green notice: "Using Environment Variables"

# Check logs
npm run dev
# Look for: "API Keys: Loaded from environment (gemini, groq)"
```

### Test AI Features

```bash
# 1. Generate AI Forecast
Go to Dashboard → Forecasts → "Generate AI Forecast"
Should use GEMINI_API_KEY from environment

# 2. Process Document
Go to Documents → AI Processing → "Process"
Should use GEMINI_API_KEY or GROQ_API_KEY from environment
```

---

## Migration Guide

### From Database to Environment Variables

If you previously stored keys in database:

1. **Get current keys from Settings page**

   - Note the masked values
   - You may need to retrieve full keys from database

2. **Set in Railway/Vercel**

   - Add as environment variables
   - Use exact same variable names

3. **Verify priority**

   - Restart application
   - Check Settings page shows "From ENV"

4. **Optional: Remove from database**
   - Click delete button in Settings
   - Only if environment variables are working

---

## API Endpoint Changes

### GET `/api/admin/api-keys`

Returns source information:

```json
{
  "settings": [
    {
      "key": "GEMINI_API_KEY",
      "label": "Gemini API Key",
      "isSet": true,
      "source": "environment", // ← Shows source
      "maskedValue": "AIza••••••••••••••abc",
      "isSecret": true
    }
  ]
}
```

### POST `/api/admin/api-keys`

Still works for database storage (fallback/local dev):

```bash
curl -X POST /api/admin/api-keys \
  -H "Content-Type: application/json" \
  -d '{"key": "GEMINI_API_KEY", "value": "your-key"}'
```

**Note:** If environment variable exists, it takes priority even after saving to database.

---

## Troubleshooting

### "No API key configured" error

1. **Check environment variables**

   ```bash
   echo $GEMINI_API_KEY  # Should show your key
   ```

2. **Check Railway/Vercel dashboard**

   - Verify variables are set
   - Check for typos in variable names

3. **Restart application**
   ```bash
   # Railway: Redeploy
   # Local: Stop and restart npm run dev
   ```

### Environment variables not being used

1. **Check for placeholders**

   - Don't use `your-key-here` or `placeholder`
   - Must be actual valid API keys

2. **Check .env file** (local only)

   - Must be in project root
   - Must not be in .gitignore (it is by default)

3. **Check priority code**
   - File: `src/lib/ai/api-keys.ts`
   - Should check environment first

---

## Best Practices

### Production (Railway/Vercel)

✅ **DO:**

- Use environment variables for all API keys
- Set different keys per environment (staging, production)
- Rotate keys periodically through platform dashboard
- Use Railway's built-in secrets management

❌ **DON'T:**

- Store production keys in database
- Commit keys to git (.env should be in .gitignore)
- Share keys in Slack/email
- Use same keys for dev and production

### Development (Local)

✅ **DO:**

- Use `.env` file for local development
- Use database storage for testing encryption
- Use separate API keys from production
- Document which keys are needed in README

❌ **DON'T:**

- Use production keys locally
- Commit .env file to git
- Share .env files in public repos

---

## Summary

**Old Approach:**

- Database first, environment fallback
- Required admin UI for all key management
- Keys stored encrypted in database

**New Approach (Better):**

- ✨ **Environment first**, database fallback
- ✨ **Railway/Vercel managed** (no UI needed)
- ✨ **More secure** - keys never touch database
- ✨ **Easier deployment** - same config across environments

**Impact:**

- ✅ Settings page shows source badges
- ✅ Prioritizes Railway environment variables
- ✅ Database storage still works (local/desktop)
- ✅ No breaking changes - backwards compatible

---

**Updated Files:**

- `src/lib/ai/api-keys.ts` - Priority logic reversed
- `src/app/api/admin/api-keys/route.ts` - Priority in GET endpoint
- `src/app/(dashboard)/settings/page.tsx` - UI shows source badges

**Documentation:**

- `RAILWAY_SETUP.md` - Updated with environment variable instructions
- `PHASE_2_SUMMARY.md` - Updated testing instructions
- `.env.example` - Clear variable names and descriptions
