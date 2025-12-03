# Part 2: Claude Coder Browser Tasks

**Assigned to:** Claude Coder (Browser) + Mustafa
**Branch:** phase-3-tender-analysis-ai

---

## Your Tasks (3 Items)

### 1. Implement Anthropic Provider
Add Claude/Anthropic API support to the LLM provider system.

**File:** `src/lib/ai/llm-provider.ts`

**What to add:**
```typescript
export async function invokeAnthropic(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = await getApiKey('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('Anthropic API key not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      messages: params.messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      })),
      system: params.messages.find(m => m.role === 'system')?.content,
      max_tokens: params.maxTokens || 4096
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    created: Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: data.content[0].text
      },
      finish_reason: data.stop_reason || 'stop'
    }],
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    }
  };
}
```

Also update `invokeUnifiedLLM` to support Anthropic as a provider option.

---

### 2. Add Rate Limiting Middleware
Create rate limiting for AI endpoints to prevent API quota exhaustion.

**New File:** `src/lib/rate-limit.ts`

```typescript
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(key: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false; // Rate limited
  }

  record.count++;
  return true;
}

export function getRateLimitHeaders(key: string, limit: number = 10): Record<string, string> {
  const record = rateLimitMap.get(key);
  const remaining = record ? Math.max(0, limit - record.count) : limit;
  const reset = record ? Math.ceil((record.resetTime - Date.now()) / 1000) : 0;

  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString()
  };
}
```

**Apply to these AI endpoints:**
- `src/app/api/tenders/[id]/analyze/route.ts`
- `src/app/api/expenses/categorize/route.ts`
- `src/app/api/inventory/optimize/route.ts`
- `src/app/api/forecasts/generate/route.ts`

Add at start of POST handlers:
```typescript
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

// Inside POST handler after session check:
const userId = session.user.id;
if (!rateLimit(`ai:${userId}`, 10, 60000)) {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Please wait before making more AI requests.' },
    { status: 429, headers: getRateLimitHeaders(`ai:${userId}`) }
  );
}
```

---

### 3. Connect Expense Anomaly Detection
Add anomaly detection panel to expenses page using the GET endpoint.

**File:** `src/app/(dashboard)/expenses/page.tsx`

**Changes:**
- Add "Detect Anomalies" button
- Call `GET /api/expenses/categorize` to get anomalies
- Display anomalies in a warning panel (unusual amounts, duplicate risks)
- Show anomaly count badge

---

## Checklist

- [ ] Task 1: Implement Anthropic Provider in llm-provider.ts
- [ ] Task 2: Create rate-limit.ts and apply to AI endpoints
- [ ] Task 3: Connect anomaly detection to expenses page
- [ ] Test all changes work
- [ ] Commit and push to `phase-3-tender-analysis-ai` branch

---

## Git Commands

```bash
# Pull latest changes first (I may have pushed)
git pull origin phase-3-tender-analysis-ai

# After making changes
git add .
git commit -m "feat: Add Anthropic provider, rate limiting, and anomaly detection UI"
git push origin phase-3-tender-analysis-ai
```

---

*Push to branch: `phase-3-tender-analysis-ai`*
