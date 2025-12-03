# Part 1: Claude Code CLI Tasks

**Assigned to:** Claude Code (CLI) - ME
**Branch:** phase-3-tender-analysis-ai

---

## My Tasks (3 Items)

### 1. Connect Tender Analysis to UI
Add "AI Analysis" button to tender detail page that calls `/api/tenders/[id]/analyze`

**File:** `src/app/(dashboard)/tenders/[id]/page.tsx`

**Changes:**
- Add state for analysis results and loading
- Add "AI Analysis" button with Brain icon
- Add modal/panel to display SWOT analysis, win probability, and recommendations

---

### 2. Connect Inventory Optimization API
Replace local insights generation with actual API call to `/api/inventory/optimize`

**File:** `src/app/(dashboard)/inventory/page.tsx`

**Changes:**
- Replace `generateAIInsights()` function with API call
- Display demand forecast, reorder recommendations, and stock optimization from API
- Add loading state and error handling

---

### 3. Add Request Timeout & Retry Logic
Add 30-second timeout and exponential backoff retry to prevent hanging requests

**File:** `src/lib/ai/llm-provider.ts`

**Changes:**
- Add AbortController with 30s timeout
- Add retry wrapper function with 3 attempts and exponential backoff
- Apply to both Gemini and Groq calls

---

## Progress Tracking

- [ ] Task 1: Tender Analysis UI Connection
- [ ] Task 2: Inventory Optimization API Connection
- [ ] Task 3: Timeout & Retry Logic

---

## I Will Push To
Branch: `phase-3-tender-analysis-ai`

*Starting work now...*
