/**
 * AI Forecasting API
 * Generates financial forecasts using historical data and AI analysis
 */

import { getRecommendedProvider, invokeUnifiedLLM } from '@/lib/ai/llm-provider';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rateLimiter, RateLimitPresets } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const forecastRequestSchema = z.object({
  timeframe: z.enum(['30', '60', '90', '180', '365']).default('90'),
  categories: z.array(z.string()).optional(),
  includeInsights: z.boolean().default(true),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply AI rate limiting per user
    const rateLimit = rateLimiter.check(request, RateLimitPresets.AI, `ai:${session.user.id}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: RateLimitPresets.AI.message,
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RateLimitPresets.AI.maxRequests),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetTime),
          },
        }
      );
    }

    const body = await request.json();
    const { timeframe } = forecastRequestSchema.parse(body);
    const days = parseInt(timeframe);

    // Fetch historical budget data (last 2 years)
    const budgets = await prisma.budget.findMany({
      where: {
        fiscalYear: { gte: new Date().getFullYear() - 2 },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        fiscalYear: true,
        type: true,
        totalAmount: true,
        startDate: true,
        endDate: true,
        status: true,
        categories: {
          select: {
            id: true,
            name: true,
            type: true,
            allocatedAmount: true,
            spentAmount: true,
            committedAmount: true,
          },
        },
      },
      take: 10,
    });

    // Get all category IDs from budgets for transaction lookup
    const categoryIds = budgets.flatMap(b => b.categories.map(c => c.id));

    // Fetch budget transactions for spending analysis
    const budgetTransactions = await prisma.budgetTransaction.findMany({
      where: {
        budgetCategoryId: { in: categoryIds },
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: {
        amount: true,
        transactionDate: true,
        description: true,
        budgetCategoryId: true,
      },
      orderBy: { transactionDate: 'desc' },
      take: 200,
    });

    // Fetch historical expense data (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: { gte: oneYearAgo },
        isDeleted: false,
        status: { in: ['APPROVED', 'PAID'] },
      },
      select: {
        amount: true,
        expenseDate: true,
        category: true,
        description: true,
      },
      orderBy: { expenseDate: 'desc' },
      take: 200,
    });

    // Calculate current metrics from categories
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const totalSpent = budgets.reduce(
      (sum, b) => sum + b.categories.reduce((catSum, c) => catSum + Number(c.spentAmount), 0),
      0
    );
    const totalCommitted = budgets.reduce(
      (sum, b) => sum + b.categories.reduce((catSum, c) => catSum + Number(c.committedAmount), 0),
      0
    );
    const consumptionRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Prepare AI prompt
    const prompt = `You are a financial forecasting AI specialized in medical distribution businesses. Analyze the following data and provide accurate forecasts.

**Current Financial State:**
- Total Budget: ${totalBudget.toFixed(2)} KWD
- Total Spent: ${totalSpent.toFixed(2)} KWD (${consumptionRate.toFixed(1)}%)
- Total Committed: ${totalCommitted.toFixed(2)} KWD
- Available: ${(totalBudget - totalSpent - totalCommitted).toFixed(2)} KWD

**Historical Budget Data (Last 2 Years):**
${JSON.stringify(
  budgets.map(b => ({
    year: b.fiscalYear,
    type: b.type,
    total: Number(b.totalAmount),
    categories: b.categories.map(c => ({
      name: c.name,
      allocated: Number(c.allocatedAmount),
      spent: Number(c.spentAmount),
      committed: Number(c.committedAmount),
    })),
  })),
  null,
  2
)}

**Recent Transaction Patterns (Last 200):**
${JSON.stringify(
  budgetTransactions.slice(0, 30).map(t => ({
    amount: Number(t.amount),
    date: t.transactionDate.toISOString().split('T')[0],
  })),
  null,
  2
)}

**Recent Expense Patterns:**
${JSON.stringify(
  expenses.slice(0, 50).map(e => ({
    amount: Number(e.amount),
    date: e.expenseDate.toISOString().split('T')[0],
    category: e.category,
  })),
  null,
  2
)}

**Forecast Requirements:**
- Timeframe: Next ${days} days
- Include confidence scores (0-100)
- Provide actionable insights
- Identify risks and opportunities

**Return ONLY valid JSON** with this EXACT structure (no markdown, no code blocks):
{
  "metrics": {
    "revenue": {
      "current": ${totalBudget},
      "predicted": <number>,
      "confidence": <0-100>,
      "trend": "<up|down|stable>",
      "percentChange": <number>
    },
    "expenses": {
      "current": ${totalSpent},
      "predicted": <number>,
      "confidence": <0-100>,
      "trend": "<up|down|stable>",
      "percentChange": <number>
    },
    "margin": {
      "current": ${totalBudget - totalSpent},
      "predicted": <number>,
      "confidence": <0-100>,
      "trend": "<up|down|stable>",
      "percentChange": <number>
    },
    "cashFlow": {
      "current": ${totalBudget - totalSpent - totalCommitted},
      "predicted": <number>,
      "confidence": <0-100>,
      "trend": "<up|down|stable>",
      "percentChange": <number>
    }
  },
  "monthlyData": [
    {
      "month": "Jan 2025",
      "revenue": <number>,
      "expenses": <number>,
      "profit": <number>,
      "cumulative": <number>
    }
  ],
  "budgetVariances": [
    {
      "category": "<category name>",
      "allocated": <number>,
      "spent": <number>,
      "variance": <number>,
      "variancePercent": <number>,
      "status": "<under|over|on-track>",
      "prediction": "<will-exceed|will-underspend|on-target>"
    }
  ],
  "aiInsights": [
    {
      "type": "<trend|risk|opportunity|forecast>",
      "title": "<brief title>",
      "description": "<detailed insight>",
      "impact": "<high|medium|low>",
      "actionable": <true|false>,
      "suggestedAction": "<optional action to take>"
    }
  ]
}`;

    try {
      const provider = await getRecommendedProvider('text');

      const result = await invokeUnifiedLLM(
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a financial forecasting AI. Always return valid JSON. No markdown formatting, no code blocks, just pure JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          maxTokens: 4000,
        },
        {
          provider,
        }
      );

      let forecastData;
      try {
        const content = result.choices[0].message.content as string;
        // Clean any potential markdown formatting
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        forecastData = JSON.parse(cleanContent);
      } catch {
        console.error('Failed to parse AI response:', result.choices[0].message.content);
        throw new Error('AI returned invalid JSON format');
      }

      // Validate forecast data structure
      if (!forecastData.metrics || !forecastData.aiInsights) {
        console.warn('Incomplete forecast data, using fallback structure');
        forecastData = {
          metrics: forecastData.metrics || {
            revenue: {
              current: totalBudget,
              predicted: totalBudget * 1.05,
              confidence: 70,
              trend: 'up',
              percentChange: 5,
            },
            expenses: {
              current: totalSpent,
              predicted: totalSpent * 1.08,
              confidence: 75,
              trend: 'up',
              percentChange: 8,
            },
            margin: {
              current: totalBudget - totalSpent,
              predicted: (totalBudget - totalSpent) * 0.95,
              confidence: 65,
              trend: 'down',
              percentChange: -5,
            },
            cashFlow: {
              current: totalBudget - totalSpent - totalCommitted,
              predicted: (totalBudget - totalSpent) * 0.9,
              confidence: 60,
              trend: 'stable',
              percentChange: 0,
            },
          },
          monthlyData: forecastData.monthlyData || [],
          budgetVariances: forecastData.budgetVariances || [],
          aiInsights: forecastData.aiInsights || [
            {
              type: 'forecast',
              title: 'Forecast Generated with Limited Data',
              description:
                'The AI forecast was generated with limited historical data. Predictions may have lower accuracy.',
              impact: 'medium',
              actionable: false,
            },
          ],
        };
      }

      // TODO: Store forecast in database (requires prisma generate after schema update)
      // Uncomment after running: npx prisma generate
      /*
      const confidenceScore = forecastData.metrics?.revenue?.confidence || 70;
      
      const savedForecast = await prisma.forecast.create({
        data: {
          name: `${days}-Day Budget Forecast`,
          description: `AI-generated forecast for ${days} days`,
          timeframeDays: days,
          forecastType: 'BUDGET',
          status: 'COMPLETED',
          predictedTotal: forecastData.metrics?.revenue?.predicted || 0,
          confidenceScore,
          insights: JSON.stringify(forecastData.aiInsights?.filter((i: any) => i.type === 'opportunity' || i.type === 'insight').map((i: any) => i.description) || []),
          recommendations: JSON.stringify(forecastData.aiInsights?.filter((i: any) => i.type === 'recommendation').map((i: any) => i.description) || []),
          risks: JSON.stringify(forecastData.aiInsights?.filter((i: any) => i.type === 'risk').map((i: any) => i.description) || []),
          opportunities: JSON.stringify(forecastData.aiInsights?.filter((i: any) => i.type === 'opportunity').map((i: any) => i.description) || []),
          aiProvider: provider,
          aiModel: result.model || 'gemini-1.5-flash',
          processingTimeMs: result.usage?.total_tokens ? result.usage.total_tokens * 10 : 1000,
          createdById: session.user.id,
          budgetForecasts: {
            create: budgets.slice(0, 5).map(b => {
              const currentTotal = Number(b.totalAmount);
              const predictedTotal = currentTotal * (1 + (forecastData.metrics?.revenue?.percentChange || 5) / 100);
              return {
                budgetId: b.id,
                budgetName: b.name,
                currentTotal,
                predictedTotal,
                variance: predictedTotal - currentTotal,
                variancePercent: ((predictedTotal - currentTotal) / currentTotal) * 100,
              };
            }),
          },
          categoryForecasts: {
            create: budgets.flatMap(b => 
              b.categories.slice(0, 3).map(c => {
                const currentSpent = Number(c.spentAmount);
                const trend = currentSpent > Number(c.allocatedAmount) * 0.8 ? 'INCREASING' : 'STABLE';
                const predictedSpent = currentSpent * 1.1;
                return {
                  categoryId: c.id,
                  categoryName: c.name,
                  currentSpent,
                  predictedSpent,
                  recommendedAlloc: predictedSpent * 1.2,
                  trend,
                  priority: currentSpent > Number(c.allocatedAmount) * 0.9 ? 'HIGH' : 'MEDIUM',
                  notes: `Projected ${trend.toLowerCase()} trend based on historical data`,
                };
              })
            ).slice(0, 10),
          },
        },
        include: {
          budgetForecasts: true,
          categoryForecasts: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: forecastData,
        forecast: {
          id: savedForecast.id,
          name: savedForecast.name,
          timeframeDays: savedForecast.timeframeDays,
          predictedTotal: Number(savedForecast.predictedTotal),
          confidenceScore: Number(savedForecast.confidenceScore),
          insights: JSON.parse(savedForecast.insights),
          recommendations: JSON.parse(savedForecast.recommendations),
          risks: savedForecast.risks ? JSON.parse(savedForecast.risks) : [],
          opportunities: savedForecast.opportunities ? JSON.parse(savedForecast.opportunities) : [],
          budgetForecasts: savedForecast.budgetForecasts.map(bf => ({
            budgetName: bf.budgetName,
            currentTotal: Number(bf.currentTotal),
            predictedTotal: Number(bf.predictedTotal),
            variance: Number(bf.variance),
            variancePercent: Number(bf.variancePercent),
          })),
          categoryForecasts: savedForecast.categoryForecasts.map(cf => ({
            categoryName: cf.categoryName,
            currentSpent: Number(cf.currentSpent),
            predictedSpent: Number(cf.predictedSpent),
            recommendedAlloc: Number(cf.recommendedAlloc),
            trend: cf.trend,
            priority: cf.priority,
          })),
          aiProvider: savedForecast.aiProvider,
          aiModel: savedForecast.aiModel,
          processingTimeMs: savedForecast.processingTimeMs,
          createdAt: savedForecast.createdAt.toISOString(),
        },
        metadata: {
          timeframe: days,
          generatedAt: new Date().toISOString(),
          provider,
          dataPoints: {
            budgets: budgets.length,
            expenses: expenses.length,
            transactions: budgetTransactions.length,
          },
        },
      });
      */

      // Temporary response without database storage
      return NextResponse.json({
        success: true,
        data: forecastData,
        metadata: {
          timeframe: days,
          generatedAt: new Date().toISOString(),
          provider,
          dataPoints: {
            budgets: budgets.length,
            expenses: expenses.length,
            transactions: budgetTransactions.length,
          },
        },
      });
    } catch (aiError) {
      console.error('AI forecasting error:', aiError);

      // Return fallback forecast based on simple statistical analysis
      const avgDailySpend =
        expenses.length > 0
          ? expenses.reduce((sum, e) => sum + Number(e.amount), 0) / expenses.length
          : totalSpent / 365;

      const projectedSpend = avgDailySpend * days;

      return NextResponse.json({
        success: true,
        data: {
          metrics: {
            revenue: {
              current: totalBudget,
              predicted: totalBudget * 1.03,
              confidence: 50,
              trend: 'stable' as const,
              percentChange: 3,
            },
            expenses: {
              current: totalSpent,
              predicted: totalSpent + projectedSpend,
              confidence: 60,
              trend: 'up' as const,
              percentChange: (projectedSpend / totalSpent) * 100,
            },
            margin: {
              current: totalBudget - totalSpent,
              predicted: totalBudget * 1.03 - (totalSpent + projectedSpend),
              confidence: 55,
              trend: 'down' as const,
              percentChange: -5,
            },
            cashFlow: {
              current: totalBudget - totalSpent - totalCommitted,
              predicted: totalBudget * 0.95 - totalSpent,
              confidence: 50,
              trend: 'stable' as const,
              percentChange: 0,
            },
          },
          monthlyData: [],
          budgetVariances: [],
          aiInsights: [
            {
              type: 'risk' as const,
              title: 'AI Forecast Unavailable',
              description: `Forecast generated using statistical analysis. AI provider error: ${
                aiError instanceof Error ? aiError.message : 'Unknown error'
              }`,
              impact: 'medium' as const,
              actionable: false,
            },
          ],
        },
        metadata: {
          timeframe: days,
          generatedAt: new Date().toISOString(),
          provider: 'statistical-fallback',
          dataPoints: {
            budgets: budgets.length,
            expenses: expenses.length,
            transactions: budgetTransactions.length,
          },
        },
        warning: 'AI forecast unavailable, using statistical fallback',
      });
    }
  } catch (error) {
    console.error('Forecast generation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate forecast',
      },
      { status: 500 }
    );
  }
}
