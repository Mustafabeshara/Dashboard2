# Part 3: GitHub Copilot Tasks

**Assigned to:** GitHub Copilot + Mustafa
**Branch:** phase-3-tender-analysis-ai

---

## Your Tasks (3 Items)

### 1. Add Token Usage Tracking
Create a system to track AI token usage for monitoring and cost analysis.

**Step A: Update Prisma Schema**

**File:** `prisma/schema.prisma`

Add this model:
```prisma
model AIUsageLog {
  id               String   @id @default(cuid())
  userId           String
  provider         String   // gemini, groq, anthropic
  model            String
  endpoint         String   // Which API endpoint made the call
  promptTokens     Int
  completionTokens Int
  totalTokens      Int
  estimatedCost    Decimal? @db.Decimal(10, 6)
  requestDuration  Int?     // milliseconds
  success          Boolean  @default(true)
  errorMessage     String?
  createdAt        DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([provider])
  @@index([createdAt])
}
```

Also add to User model:
```prisma
// In the User model, add:
aiUsageLogs     AIUsageLog[]
```

**Step B: Create Usage Tracker**

**New File:** `src/lib/ai/usage-tracker.ts`

```typescript
import prisma from '@/lib/prisma';

const COST_PER_1K_TOKENS = {
  gemini: { prompt: 0.00025, completion: 0.0005 },
  groq: { prompt: 0.0001, completion: 0.0001 },
  anthropic: { prompt: 0.00025, completion: 0.00125 }
};

export async function logAIUsage(params: {
  userId: string;
  provider: string;
  model: string;
  endpoint: string;
  promptTokens: number;
  completionTokens: number;
  requestDuration?: number;
  success?: boolean;
  errorMessage?: string;
}) {
  try {
    const costs = COST_PER_1K_TOKENS[params.provider as keyof typeof COST_PER_1K_TOKENS];
    const estimatedCost = costs
      ? (params.promptTokens / 1000) * costs.prompt +
        (params.completionTokens / 1000) * costs.completion
      : null;

    await prisma.aIUsageLog.create({
      data: {
        userId: params.userId,
        provider: params.provider,
        model: params.model,
        endpoint: params.endpoint,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.promptTokens + params.completionTokens,
        estimatedCost,
        requestDuration: params.requestDuration,
        success: params.success ?? true,
        errorMessage: params.errorMessage
      }
    });
  } catch (error) {
    console.error('Failed to log AI usage:', error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

export async function getAIUsageStats(userId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const stats = await prisma.aIUsageLog.groupBy({
    by: ['provider'],
    where: {
      userId,
      createdAt: { gte: since }
    },
    _sum: {
      totalTokens: true,
      estimatedCost: true
    },
    _count: true
  });

  return stats;
}
```

---

### 2. Create AI Usage Dashboard Widget
Add a widget to show AI usage statistics.

**New File:** `src/components/ai/usage-stats.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Zap, DollarSign } from 'lucide-react';

interface UsageStats {
  provider: string;
  _count: number;
  _sum: {
    totalTokens: number | null;
    estimatedCost: number | null;
  };
}

export function AIUsageStats() {
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/ai-usage')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;
  }

  const totalTokens = stats.reduce((sum, s) => sum + (s._sum.totalTokens || 0), 0);
  const totalCost = stats.reduce((sum, s) => sum + Number(s._sum.estimatedCost || 0), 0);
  const totalCalls = stats.reduce((sum, s) => sum + s._count, 0);

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Calls (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{totalCalls.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Tokens Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Est. Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 3. Create AI Usage API Endpoint

**New File:** `src/app/api/admin/ai-usage/route.ts`

```typescript
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/manager
    const userRole = session.user.role;
    if (!['ADMIN', 'MANAGER'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await prisma.aIUsageLog.groupBy({
      by: ['provider'],
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _sum: {
        totalTokens: true,
        estimatedCost: true
      },
      _count: true
    });

    const recentLogs = await prisma.aIUsageLog.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        provider: true,
        model: true,
        endpoint: true,
        totalTokens: true,
        estimatedCost: true,
        success: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      stats,
      recentLogs
    });
  } catch (error) {
    console.error('AI usage fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage stats' },
      { status: 500 }
    );
  }
}
```

---

## After Completing Tasks

Run these commands:
```bash
# Generate Prisma client with new model
npx prisma generate

# Push schema to database
DATABASE_URL="postgresql://postgres:XaaDNvfvVqfmgHzHPSrgcZCOAWYWSqkG@turntable.proxy.rlwy.net:59955/railway" npx prisma db push
```

---

## Checklist

- [ ] Task 1: Add AIUsageLog model to schema + create usage-tracker.ts
- [ ] Task 2: Create AI usage stats component
- [ ] Task 3: Create AI usage API endpoint
- [ ] Run `npx prisma generate` and `npx prisma db push`
- [ ] Test all changes work
- [ ] Commit and push to `phase-3-tender-analysis-ai` branch

---

## Git Commands

```bash
# Pull latest changes first
git pull origin phase-3-tender-analysis-ai

# After making changes
git add .
git commit -m "feat: Add AI token usage tracking and dashboard"
git push origin phase-3-tender-analysis-ai
```

---

*Push to branch: `phase-3-tender-analysis-ai`*
