/**
 * Expense Auto-categorization API
 * AI-powered expense categorization with anomaly detection
 */

import { invokeUnifiedLLM } from '@/lib/ai/llm-provider';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CategoryWithScore {
  category: string;
  score: number;
  reasoning: string;
}

interface AnomalyReason {
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenseId = params.id;

    // Check if already categorized
    const existing = await prisma.expenseCategorization.findUnique({
      where: { expenseId },
      include: {
        expense: {
          include: {
            vendor: { select: { name: true, type: true } },
            budgetCategory: { select: { name: true, parentCategoryId: true } },
          },
        },
      },
    });

    if (existing && existing.isConfirmed) {
      return NextResponse.json({
        success: true,
        data: existing,
        cached: true,
        message: 'Using confirmed categorization',
      });
    }

    // Fetch expense data
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId, isDeleted: false },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            type: true,
            country: true,
          },
        },
        budgetCategory: {
          select: {
            id: true,
            name: true,
            parentCategoryId: true,
          },
        },
        approvedBy: {
          select: {
            fullName: true,
            department: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Fetch historical expenses for pattern analysis
    const historicalExpenses = await prisma.expense.findMany({
      where: {
        vendorId: expense.vendorId,
        isDeleted: false,
        status: 'APPROVED',
        id: { not: expenseId },
      },
      orderBy: { expenseDate: 'desc' },
      take: 50,
      select: {
        id: true,
        amount: true,
        description: true,
        expenseDate: true,
        category: true,
      },
    });

    // Fetch available budget categories
    const categories = await prisma.budgetCategory.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        parentCategoryId: true,
        type: true,
      },
    });

    // Build AI prompt for categorization
    const systemPrompt = `You are an expert financial analyst specializing in expense categorization and anomaly detection for medical device distribution companies.

Your task is to:
1. Categorize expenses accurately based on description, amount, and vendor
2. Detect anomalies and unusual spending patterns
3. Provide confidence scores and reasoning
4. Identify similar historical expenses

Respond ONLY with valid JSON matching this exact structure:
{
  "predictedCategory": "category name from available list",
  "confidence": 85.5,
  "reasoning": "why this category fits",
  "alternativeCategories": [
    {"category": "name", "score": 75, "reasoning": "why alternative"},
    {"category": "name", "score": 60, "reasoning": "why alternative"}
  ],
  "isAnomaly": false,
  "anomalyScore": 15.5,
  "anomalyReasons": [
    {"type": "AMOUNT_OUTLIER", "description": "amount significantly higher", "severity": "MEDIUM"}
  ],
  "spendingPattern": "REGULAR",
  "similarExpenseIds": ["uuid1", "uuid2"],
  "insights": ["insight 1", "insight 2"]
}`;

    const categoryList = categories.map(c => `- ${c.name} (${c.type})`).join('\n');

    const historicalSummary =
      historicalExpenses.length > 0
        ? historicalExpenses
            .map(
              e =>
                `${e.expenseDate.toISOString().split('T')[0]}: ${
                  e.category || 'Uncategorized'
                } - $${e.amount} - ${e.description?.substring(0, 100) || 'N/A'}`
            )
            .join('\n')
        : 'No historical expenses available';

    const userPrompt = `Analyze this expense:

**Expense Details:**
- ID: ${expense.id}
- Description: ${expense.description || 'N/A'}
- Amount: ${expense.amount} ${expense.currency}
- Date: ${expense.expenseDate.toISOString().split('T')[0]}
- Vendor: ${expense.vendor?.name || 'Unknown'} (${expense.vendor?.type || 'N/A'})
- Current Category: ${expense.budgetCategory?.name || expense.category || 'Uncategorized'}
- Status: ${expense.status}

**Available Categories:**
${categoryList}

**Historical Expenses from Same Vendor (last 50):**
${historicalSummary}

**Analysis Instructions:**
1. Choose the BEST category from the available list
2. Provide 2-3 alternative categories with scores
3. Check for anomalies:
   - Amount outliers (compare with historical average)
   - Unusual timing or frequency
   - Mismatched vendor/category combinations
   - Duplicate or suspicious patterns
4. Calculate anomaly score (0-100, where 100 is highly anomalous)
5. Determine spending pattern: REGULAR, SEASONAL, IRREGULAR
6. List IDs of similar historical expenses

Respond with valid JSON only. No additional text.`;

    // Invoke AI
    const aiResponse = await invokeUnifiedLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 2000,
    });

    if (!aiResponse.choices?.[0]?.message?.content) {
      throw new Error('AI response failed or empty');
    }

    // Parse AI response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysisData: any;
    try {
      const content = aiResponse.choices[0]?.message?.content;
      const contentText =
        typeof content === 'string'
          ? content
          : Array.isArray(content)
          ? content.map(c => ('text' in c ? c.text : '')).join(' ')
          : '';
      const jsonMatch = contentText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : contentText;
      analysisData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Provide default fallback
      analysisData = {
        predictedCategory: expense.budgetCategory?.name || expense.category || 'Uncategorized',
        confidence: 50,
        reasoning: 'Unable to parse AI response',
        alternativeCategories: [],
        isAnomaly: false,
        anomalyScore: 0,
        anomalyReasons: [],
        spendingPattern: 'REGULAR',
        similarExpenseIds: [],
        insights: ['AI analysis failed, manual review recommended'],
      };
    }

    // Save categorization to database
    const categorization = await prisma.expenseCategorization.upsert({
      where: { expenseId },
      create: {
        expenseId,
        predictedCategory: analysisData.predictedCategory,
        confidence: analysisData.confidence || 0,
        alternativeCategories: JSON.stringify(analysisData.alternativeCategories || []),
        isAnomaly: analysisData.isAnomaly || false,
        anomalyScore: analysisData.anomalyScore || 0,
        anomalyReasons: JSON.stringify(analysisData.anomalyReasons || []),
        similarExpenses: JSON.stringify(analysisData.similarExpenseIds || []),
        spendingPattern: analysisData.spendingPattern || 'REGULAR',
        aiProvider: aiResponse.model || 'gemini',
        aiModel: aiResponse.model || 'gemini-1.5-flash-002',
      },
      update: {
        predictedCategory: analysisData.predictedCategory,
        confidence: analysisData.confidence || 0,
        alternativeCategories: JSON.stringify(analysisData.alternativeCategories || []),
        isAnomaly: analysisData.isAnomaly || false,
        anomalyScore: analysisData.anomalyScore || 0,
        anomalyReasons: JSON.stringify(analysisData.anomalyReasons || []),
        similarExpenses: JSON.stringify(analysisData.similarExpenseIds || []),
        spendingPattern: analysisData.spendingPattern || 'REGULAR',
        aiProvider: aiResponse.model || 'gemini',
        aiModel: aiResponse.model || 'gemini-1.5-flash-002',
        categorizedAt: new Date(),
        isConfirmed: false, // Reset confirmation on re-analysis
      },
      include: {
        expense: {
          include: {
            vendor: { select: { name: true } },
            budgetCategory: { select: { name: true } },
          },
        },
      },
    });

    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...categorization,
        alternativeCategories: JSON.parse(categorization.alternativeCategories),
        anomalyReasons: categorization.anomalyReasons
          ? JSON.parse(categorization.anomalyReasons)
          : [],
        similarExpenses: categorization.similarExpenses
          ? JSON.parse(categorization.similarExpenses)
          : [],
        insights: analysisData.insights || [],
        reasoning: analysisData.reasoning,
      },
      cached: false,
      processingTimeMs,
    });
  } catch (error) {
    console.error('Expense categorization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to categorize expense',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing categorization
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categorization = await prisma.expenseCategorization.findUnique({
      where: { expenseId: params.id },
      include: {
        expense: {
          include: {
            vendor: { select: { name: true } },
            budgetCategory: { select: { name: true } },
          },
        },
        reviewedBy: {
          select: {
            fullName: true,
            department: true,
          },
        },
      },
    });

    if (!categorization) {
      return NextResponse.json({ error: 'Categorization not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...categorization,
        alternativeCategories: JSON.parse(categorization.alternativeCategories),
        anomalyReasons: categorization.anomalyReasons
          ? JSON.parse(categorization.anomalyReasons)
          : [],
        similarExpenses: categorization.similarExpenses
          ? JSON.parse(categorization.similarExpenses)
          : [],
      },
    });
  } catch (error) {
    console.error('Get categorization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve categorization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint to confirm categorization
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isConfirmed, selectedCategory } = body;

    const categorization = await prisma.expenseCategorization.update({
      where: { expenseId: params.id },
      data: {
        isConfirmed: isConfirmed || false,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        ...(selectedCategory && { predictedCategory: selectedCategory }),
      },
      include: {
        expense: true,
        reviewedBy: { select: { fullName: true } },
      },
    });

    // If confirmed and category changed, update the expense budget category
    if (isConfirmed && selectedCategory) {
      const newCategory = await prisma.budgetCategory.findFirst({
        where: { name: selectedCategory, isDeleted: false },
      });

      if (newCategory) {
        await prisma.expense.update({
          where: { id: params.id },
          data: { budgetCategoryId: newCategory.id },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: categorization,
      message: isConfirmed ? 'Categorization confirmed' : 'Categorization updated',
    });
  } catch (error) {
    console.error('Update categorization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update categorization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
