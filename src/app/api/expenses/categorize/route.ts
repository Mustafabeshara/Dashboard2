/**
 * Expense Auto-Categorization API
 * AI-powered expense categorization with anomaly detection
 */

import { getRecommendedProvider, invokeUnifiedLLM } from '@/lib/ai/llm-provider';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const categorizeRequestSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  vendorName: z.string().optional(),
  date: z.string().optional(),
});

const EXPENSE_CATEGORIES = [
  'GENERAL',
  'TRAVEL',
  'OFFICE',
  'UTILITIES',
  'MARKETING',
  'EQUIPMENT',
  'PROFESSIONAL',
  'INSURANCE',
  'TAXES',
  'MEDICAL_SUPPLIES',
  'LOGISTICS',
  'MAINTENANCE',
  'OTHER',
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, vendorName, date } = categorizeRequestSchema.parse(body);

    // Fetch recent expenses for pattern detection
    const recentExpenses = await prisma.expense.findMany({
      where: {
        isDeleted: false,
        createdById: session.user.id,
      },
      select: {
        description: true,
        category: true,
        amount: true,
        vendor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Find similar past expenses
    const descWords = description.toLowerCase().split(' ');
    const similarExpenses = recentExpenses.filter(exp => {
      const expWords = exp.description.toLowerCase().split(' ');
      return descWords.some(word => word.length > 3 && expWords.includes(word));
    });

    // Calculate average amount for similar expenses
    const avgSimilarAmount = similarExpenses.length > 0
      ? similarExpenses.reduce((sum, e) => sum + Number(e.amount), 0) / similarExpenses.length
      : 0;

    // Build AI prompt
    const prompt = `You are an expense categorization AI for a medical distribution company in Kuwait.

**Expense to Categorize:**
- Description: "${description}"
- Amount: ${amount} KWD
- Vendor: ${vendorName || 'Not specified'}
- Date: ${date || 'Not specified'}

**Available Categories:**
${EXPENSE_CATEGORIES.map(c => `- ${c}`).join('\n')}

**Similar Past Expenses:**
${similarExpenses.slice(0, 5).map(e => `- "${e.description}" → ${e.category} (${Number(e.amount)} KWD)`).join('\n') || 'No similar expenses found'}

**Average Amount for Similar Items:** ${avgSimilarAmount > 0 ? `${avgSimilarAmount.toFixed(2)} KWD` : 'N/A'}

**Analyze and return ONLY valid JSON (no markdown):**
{
  "category": "EXACT_CATEGORY_FROM_LIST",
  "confidence": <0-100>,
  "reasoning": "brief explanation",
  "alternativeCategories": [
    { "category": "CATEGORY", "confidence": <0-100> }
  ],
  "anomalyDetection": {
    "isAnomaly": <true|false>,
    "type": "normal|unusual_amount|unusual_vendor|unusual_timing|duplicate_risk|null",
    "severity": "low|medium|high|null",
    "description": "explanation if anomaly detected or null",
    "expectedRange": { "min": <number|null>, "max": <number|null> }
  },
  "suggestions": {
    "budgetCategory": "suggested budget category to link or null",
    "tags": ["suggested", "tags"],
    "reviewRequired": <true|false>
  }
}`;

    try {
      const provider = await getRecommendedProvider('text');

      const result = await invokeUnifiedLLM(
        {
          messages: [
            {
              role: 'system',
              content: 'You are an expense categorization AI. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          maxTokens: 1000,
        },
        { provider }
      );

      let categorization;
      try {
        const content = result.choices[0].message.content as string;
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        categorization = JSON.parse(cleanContent);
      } catch {
        // Fallback categorization
        const mostCommonCategory = similarExpenses.length > 0
          ? similarExpenses[0].category
          : 'GENERAL';

        categorization = {
          category: mostCommonCategory,
          confidence: 50,
          reasoning: 'Based on expense description analysis',
          alternativeCategories: [],
          anomalyDetection: {
            isAnomaly: avgSimilarAmount > 0 && amount > avgSimilarAmount * 2,
            type: amount > avgSimilarAmount * 2 ? 'unusual_amount' : 'normal',
            severity: amount > avgSimilarAmount * 3 ? 'high' : amount > avgSimilarAmount * 2 ? 'medium' : null,
            description: amount > avgSimilarAmount * 2 ? `Amount is ${(amount / avgSimilarAmount).toFixed(1)}x higher than average` : null,
            expectedRange: avgSimilarAmount > 0 ? { min: avgSimilarAmount * 0.5, max: avgSimilarAmount * 1.5 } : null,
          },
          suggestions: {
            budgetCategory: null,
            tags: [],
            reviewRequired: amount > 1000,
          },
        };
      }

      // Validate category is in allowed list
      if (!EXPENSE_CATEGORIES.includes(categorization.category)) {
        categorization.category = 'GENERAL';
        categorization.confidence = Math.min(categorization.confidence, 60);
      }

      return NextResponse.json({
        success: true,
        data: categorization,
        metadata: {
          processedAt: new Date().toISOString(),
          similarExpensesFound: similarExpenses.length,
          provider,
        },
      });
    } catch (aiError) {
      // Return basic categorization without AI
      return NextResponse.json({
        success: true,
        data: {
          category: 'GENERAL',
          confidence: 30,
          reasoning: 'AI unavailable - default categorization applied',
          alternativeCategories: [],
          anomalyDetection: {
            isAnomaly: false,
            type: 'normal',
            severity: null,
            description: null,
            expectedRange: null,
          },
          suggestions: {
            budgetCategory: null,
            tags: [],
            reviewRequired: amount > 5000,
          },
        },
        metadata: {
          processedAt: new Date().toISOString(),
          similarExpensesFound: similarExpenses.length,
          provider: 'fallback',
        },
        warning: `AI categorization unavailable: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
      });
    }
  } catch (error) {
    console.error('Expense categorization error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to categorize expense' },
      { status: 500 }
    );
  }
}

/**
 * GET - Batch analyze expenses for anomalies
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch recent expenses
    const expenses = await prisma.expense.findMany({
      where: {
        isDeleted: false,
        expenseDate: { gte: startDate },
      },
      select: {
        id: true,
        expenseNumber: true,
        description: true,
        amount: true,
        category: true,
        expenseDate: true,
        vendor: { select: { name: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    if (expenses.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          anomalies: [],
          summary: {
            totalExpenses: 0,
            totalAmount: 0,
            anomalyCount: 0,
            riskScore: 0,
          },
        },
      });
    }

    // Calculate statistics per category
    const categoryStats: Record<string, { count: number; total: number; amounts: number[] }> = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'GENERAL';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, total: 0, amounts: [] };
      }
      categoryStats[cat].count++;
      categoryStats[cat].total += Number(exp.amount);
      categoryStats[cat].amounts.push(Number(exp.amount));
    });

    // Detect anomalies using statistical analysis
    const anomalies: Array<{
      expenseId: string;
      expenseNumber: string;
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      amount: number;
      expectedRange: { min: number; max: number };
    }> = [];

    expenses.forEach(exp => {
      const cat = exp.category || 'GENERAL';
      const stats = categoryStats[cat];
      const avg = stats.total / stats.count;
      const amount = Number(exp.amount);

      // Calculate standard deviation
      const variance = stats.amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / stats.count;
      const stdDev = Math.sqrt(variance);

      // Flag if more than 2 standard deviations from mean
      if (amount > avg + 2 * stdDev && amount > avg * 2) {
        anomalies.push({
          expenseId: exp.id,
          expenseNumber: exp.expenseNumber,
          type: 'unusual_amount',
          severity: amount > avg * 3 ? 'high' : 'medium',
          description: `Amount ${amount.toLocaleString()} KWD is ${((amount / avg - 1) * 100).toFixed(0)}% above category average`,
          amount,
          expectedRange: { min: avg * 0.5, max: avg * 1.5 },
        });
      }
    });

    // Check for potential duplicates
    const seen = new Map<string, typeof expenses[0]>();
    expenses.forEach(exp => {
      const key = `${exp.amount}-${exp.category}-${exp.description.toLowerCase().substring(0, 20)}`;
      const existing = seen.get(key);
      if (existing && existing.id !== exp.id) {
        const daysDiff = Math.abs(
          (new Date(exp.expenseDate).getTime() - new Date(existing.expenseDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff < 7) {
          anomalies.push({
            expenseId: exp.id,
            expenseNumber: exp.expenseNumber,
            type: 'duplicate_risk',
            severity: 'medium',
            description: `Possible duplicate of ${existing.expenseNumber} (${daysDiff.toFixed(0)} days apart)`,
            amount: Number(exp.amount),
            expectedRange: { min: 0, max: 0 },
          });
        }
      }
      seen.set(key, exp);
    });

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const riskScore = Math.min(100, (anomalies.length / expenses.length) * 100 * 5);

    return NextResponse.json({
      success: true,
      data: {
        anomalies,
        summary: {
          totalExpenses: expenses.length,
          totalAmount,
          anomalyCount: anomalies.length,
          riskScore: Math.round(riskScore),
          categoryBreakdown: Object.entries(categoryStats).map(([cat, stats]) => ({
            category: cat,
            count: stats.count,
            total: stats.total,
            average: stats.total / stats.count,
          })),
        },
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        periodDays: days,
      },
    });
  } catch (error) {
    console.error('Expense anomaly detection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze expenses' },
      { status: 500 }
    );
  }
}
