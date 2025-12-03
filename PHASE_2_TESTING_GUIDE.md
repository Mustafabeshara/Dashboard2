# Phase 2: Critical Workflow Testing Guide

**Created:** December 3, 2025  
**Purpose:** Manual testing procedures for Budget Creation, AI Forecasting, Document Processing, and API Key Management

---

## Prerequisites

### 1. Environment Setup

You need to create a `.env` file in the project root. Choose one of these options:

#### Option A: Use Railway Production Database (Recommended for Testing)

```bash
# Copy this to .env file
DATABASE_URL="<your-railway-postgres-url>"
NEXTAUTH_SECRET="<your-nextauth-secret>"
NEXTAUTH_URL="http://localhost:3000"

# AI Provider Keys (get from Railway environment or generate new)
GEMINI_API_KEY="<your-gemini-api-key>"
GROQ_API_KEY="<your-groq-api-key>"
```

**To get these values:**

1. Go to your Railway dashboard
2. Select your project
3. Click on Variables tab
4. Copy `DATABASE_URL`, `NEXTAUTH_SECRET` values
5. Get AI keys from the database or Settings page

#### Option B: Local PostgreSQL (If You Have It Installed)

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/medical_db?schema=public"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"
```

Then run:

```bash
npx prisma db push
npx prisma db seed
```

### 2. Start Development Server

```bash
npm run dev
```

Server should start on `http://localhost:3000` (or 3001 if 3000 is busy)

---

## Test 1: Budget Creation Workflow ✅

**What We Fixed:** Connected placeholder form to real `/api/budgets` POST endpoint

### Test Steps:

1. **Navigate to Budget Creation**

   - Login with admin credentials
   - Go to Budgets → Create Budget

2. **Fill Out Form**

   - Budget Code: `TEST-2025-Q1`
   - Name: `Q1 2025 Test Budget`
   - Department: Select any (e.g., "Medical Supplies")
   - Fiscal Year: `2025`
   - Start Date: `2025-01-01`
   - End Date: `2025-03-31`
   - Status: `DRAFT` or `ACTIVE`

3. **Add Categories**

   - Click "Add Category"
   - Level: `1`
   - Code: `CAT-001`
   - Name: `Surgical Equipment`
   - Description: `Medical surgical tools and equipment`
   - Allocated Amount: `50000`
   - Click "Add Category" again for second one:
     - Level: `2`
     - Code: `CAT-001-01`
     - Parent: Select `Surgical Equipment`
     - Name: `Scalpels and Blades`
     - Allocated Amount: `5000`

4. **Submit Budget**
   - Click "Create Budget" button
   - Should see success toast notification

### Expected Results:

✅ **Success Indicators:**

- Toast notification: "Budget created successfully"
- Redirect to budget list page
- New budget appears in the list
- Categories are properly nested in hierarchy

❌ **Failure Indicators:**

- Error toast with API error message
- Check browser console (F12) for detailed error
- Check server terminal logs for backend errors

### What to Check:

**In Browser Console (F12):**

```javascript
// Should see successful API call
POST /api/budgets 200 OK
{
  "id": "cm4qxxx...",
  "code": "TEST-2025-Q1",
  "name": "Q1 2025 Test Budget",
  // ... rest of budget data
}
```

**In Database (if accessible):**

```sql
-- Check if budget was created
SELECT * FROM "Budget" WHERE code = 'TEST-2025-Q1';

-- Check if categories were created
SELECT * FROM "BudgetCategory" WHERE "budgetId" IN (
  SELECT id FROM "Budget" WHERE code = 'TEST-2025-Q1'
);
```

---

## Test 2: AI Forecasting with Real API ✅

**What We Fixed:** Created `/api/forecasts/generate` endpoint that calls Gemini/Groq

### Test Steps:

1. **Verify API Keys**

   - Go to Settings page
   - Check if Gemini API Key is set
   - If not, add your key and save

2. **Navigate to Forecasts**

   - Go to Dashboard → Forecasts
   - Wait for initial data to load

3. **Generate AI Forecast**

   - Click "Generate AI Forecast" button
   - Should see loading spinner
   - Wait 10-30 seconds (AI processing time)

4. **Review Results**
   - Check "AI Insights" section for new predictions
   - Look at "Budget Variance Analysis" for AI-detected anomalies
   - Verify monthly forecast data is populated

### Expected Results:

✅ **Success Indicators:**

- Loading spinner appears
- After 10-30 seconds, AI insights appear
- Insights include:
  - Revenue forecasts with confidence scores
  - Expense predictions
  - Budget variance warnings
  - Recommended actions
- No error messages in console

❌ **Failure Indicators:**

- Error toast: "Failed to generate AI forecast"
- Console error about API key or LLM provider
- Timeout error (>60 seconds)
- Empty insights after loading completes

### What to Check:

**In Browser Console (F12):**

```javascript
// Successful API call
POST /api/forecasts/generate 200 OK
{
  "success": true,
  "metrics": {
    "projectedRevenue": 1250000,
    "projectedExpenses": 980000,
    // ...
  },
  "aiInsights": [
    {
      "category": "Revenue",
      "trend": "increasing",
      "confidence": 0.85,
      // ...
    }
  ]
}
```

**In Server Terminal:**

```
AI Forecasting: Fetching historical budget data...
AI Forecasting: Found X budgets, Y transactions
AI Forecasting: Invoking LLM provider (gemini)...
AI Forecasting: Successfully generated forecast
```

### Common Issues:

**"No API key configured"**

- Go to Settings → API Keys
- Add valid Gemini or Groq API key
- Click Save and retry

**"Insufficient historical data"**

- Need at least 3 months of budget/expense data
- Run `npm run db:seed` to populate test data
- Or create some budgets manually first

**Timeout errors**

- Check internet connection
- Verify API key is valid (test at https://aistudio.google.com/)
- Try Groq fallback by temporarily removing Gemini key

---

## Test 3: Document Upload & AI Extraction ✅

**What We Fixed:** Connected to correct `/api/documents/[id]/process` endpoint

### Test Steps:

1. **Navigate to Document AI**

   - Go to Documents → AI Processing

2. **Check Processing Queue**

   - Should see list of uploaded documents
   - Status should be: PENDING, PROCESSING, COMPLETED, or FAILED

3. **Process a Document**

   - Find a document with status "PENDING"
   - Click "Process" button
   - Watch status change to "PROCESSING"

4. **Monitor Processing**

   - Page polls every 5 seconds
   - Status should update automatically
   - After 20-60 seconds, should change to "COMPLETED"

5. **View Extraction Results**
   - Click "View Details" on completed document
   - Should see extracted tender information:
     - Tender Number
     - Issuing Authority (e.g., MOH Kuwait)
     - Deadline
     - Budget Range
     - Requirements
     - Items/Categories

### Expected Results:

✅ **Success Indicators:**

- Document status transitions: PENDING → PROCESSING → COMPLETED
- Extraction data appears with confidence scores
- Tender details are accurate (if it's a real tender doc)
- Processing time: 20-60 seconds depending on document size

❌ **Failure Indicators:**

- Status stuck on PROCESSING for >5 minutes
- Status changes to FAILED with error message
- Empty extraction results even on COMPLETED status
- Console errors about missing API endpoint

### What to Check:

**In Browser Console (F12):**

```javascript
// Processing request
POST /api/documents/abc123/process 200 OK
{ "message": "Processing started", "jobId": "xyz789" }

// Polling for status
GET /api/documents/abc123 200 OK
{ "status": "PROCESSING", "progress": 45 }

// Final result
GET /api/documents/abc123 200 OK
{
  "status": "COMPLETED",
  "extraction": {
    "tenderNumber": "MOH-2025-001",
    "issuingAuthority": "Ministry of Health Kuwait",
    // ...
  }
}
```

**In Server Terminal:**

```
Document Processing: Starting extraction for doc abc123
Document Processing: Using provider gemini
Document Processing: Extracted 15 items, confidence 0.92
Document Processing: Saved extraction results
```

### Test with Sample Document:

If you don't have real tender documents, create a simple test PDF with this content:

```
MINISTRY OF HEALTH - KUWAIT
Tender Announcement

Tender Number: MOH-TEST-2025-001
Deadline: January 15, 2025

Requirements:
- 500 units Surgical Gloves
- 200 units Syringes (10ml)
- 100 units Stethoscopes

Budget Estimate: 50,000 - 75,000 KWD

Contact: tenders@moh.gov.kw
```

Upload this and test the extraction.

---

## Test 4: API Key Management ✅

**What We Fixed:** Verified encryption/decryption system in settings

### Test Steps:

1. **Navigate to Settings**

   - Go to Settings page
   - Scroll to "AI Configuration" section

2. **Save New API Key**

   - Enter test Gemini key: `test-key-12345-abcde`
   - Click "Save Settings"
   - Should see success notification

3. **Verify Encryption**

   - Open browser DevTools → Application → Storage
   - Check that key is NOT stored in localStorage/sessionStorage
   - Should only be in database (encrypted)

4. **Test Key Retrieval**

   - Refresh the page
   - API keys should NOT be visible (shown as masked: `***...***`)
   - Click "Test Connection" if available

5. **Test with Real Key**
   - Replace with actual Gemini API key
   - Save settings
   - Go back to Forecasts page
   - Try generating AI forecast (should work now)

### Expected Results:

✅ **Success Indicators:**

- Settings save successfully
- Keys are encrypted in database (not plaintext)
- Keys work for AI operations (forecasting, extraction)
- After page refresh, keys are NOT displayed
- No API keys logged in browser console

❌ **Failure Indicators:**

- Error saving settings
- API keys visible in plaintext in network requests
- Keys don't work for AI operations after saving
- Decryption errors in server logs

### What to Check:

**In Browser Console (F12):**

```javascript
// Saving keys
POST /api/admin/api-keys 200 OK
{ "message": "API keys saved successfully" }

// Keys should NOT appear in response
// Should see encrypted format: "iv:authtag:encrypted"
```

**In Database (if accessible):**

```sql
-- Check encryption
SELECT key, value FROM "AppSettings" WHERE key = 'GEMINI_API_KEY';
-- Value should look like: "abc123:def456:ghi789..." (encrypted)
```

**Test Decryption:**

```bash
# In server logs when using AI features
API Keys: Loaded from database
API Keys: Decrypted 2 providers (gemini, groq)
API Keys: Gemini configured ✓
```

---

## Test 5: Integration Test - Full Workflow

**Test complete budget lifecycle with AI assistance:**

### Scenario: Create Q1 Budget → Get AI Forecast → Upload Tender → Track Against Budget

1. **Create Budget** (Test 1)

   - Create "Q1 2025 Medical Supplies" budget
   - Add 5-6 categories with allocations
   - Set status to ACTIVE
   - Total allocation: 500,000 KWD

2. **Generate AI Forecast** (Test 2)

   - Go to Forecasts
   - Generate AI predictions
   - Review variance warnings
   - Check which categories are projected to exceed

3. **Upload Tender Document** (Test 3)

   - Upload tender PDF for medical supplies
   - Process with AI extraction
   - Review extracted items and costs
   - Should match budget categories

4. **Create Budget Transaction**

   - Go to Budget Transactions
   - Create transaction for extracted tender
   - Link to appropriate budget category
   - Amount: 45,000 KWD

5. **Verify Budget Impact**

   - Go back to Budget list
   - Check that category's `spentAmount` increased
   - Check that `availableAmount` decreased
   - Verify percentage consumed is accurate

6. **Check AI Insights Update**
   - Return to Forecasts
   - Generate new AI forecast
   - Should reflect the new transaction
   - Variance analysis should be updated

### Expected End State:

✅ **Success Indicators:**

- Budget created with categories ✓
- AI forecast generated with insights ✓
- Document extracted with tender data ✓
- Transaction posted against budget ✓
- Budget amounts updated correctly ✓
- AI reflects latest transaction data ✓

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npx prisma db pull

# Reset local database if needed
npx prisma migrate reset --skip-seed
npx prisma db seed
```

### AI Provider Issues

```bash
# Test Gemini API key manually
curl https://generativelanguage.googleapis.com/v1/models?key=YOUR_API_KEY

# Test Groq API key
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Clear Cache & Rebuild

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules (if needed)
rm -rf node_modules
npm install

# Regenerate Prisma client
npm run db:generate

# Restart dev server
npm run dev
```

### Common Error Messages

**"Environment variable not found: DATABASE_URL"**

- Solution: Create `.env` file with DATABASE_URL

**"No API key configured"**

- Solution: Add keys via Settings page or .env file

**"Prisma Client initialization error"**

- Solution: Run `npx prisma generate`

**"Authentication error: No user found"**

- Solution: Run `npm run db:seed` to create test users

**"Port 3000 already in use"**

- Solution: Kill process on port 3000 or use port 3001

---

## Success Criteria

Phase 2 is considered **COMPLETE** when all these pass:

- [ ] Budget creation works end-to-end
- [ ] AI forecasting generates real predictions
- [ ] Document processing extracts tender data
- [ ] API keys save/load with encryption
- [ ] Integration test completes successfully
- [ ] No critical errors in console or server logs

---

## Next Phase Preview

**Phase 3: Advanced AI Tools** (20-24 hours)

After Phase 2 testing passes, we'll implement:

1. **Budget Forecasting AI** - Historical analysis with ML predictions
2. **Tender Analysis AI** - Competitive analysis and win probability
3. **Expense Auto-categorization** - Smart classification with anomaly detection
4. **Inventory Optimization AI** - Demand forecasting and stock recommendations

Each tool will include:

- Dedicated Prisma model for storing AI results
- API endpoint with proper session handling
- React component with real-time updates
- Test suite with mocked AI responses

---

## Notes

- **Testing Environment**: Use Railway database for testing (production data)
- **API Costs**: AI forecasting costs ~$0.01-0.05 per request
- **Processing Time**: Document extraction: 20-60s, Forecasting: 10-30s
- **Data Requirements**: Need 3+ months of budgets/expenses for meaningful AI forecasts

**Created by:** GitHub Copilot  
**Last Updated:** December 3, 2025  
**Related Docs:** APP_REVIEW_AND_IMPROVEMENTS.md, QUICK_START.md
