/**
 * Inventory Optimization AI API
 * AI-powered demand forecasting and reorder recommendations
 */

import { invokeUnifiedLLM } from '@/lib/ai/llm-provider';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: productId } = await params;

    // Fetch product data
    const product = await prisma.product.findUnique({
      where: { id: productId, isDeleted: false },
      include: {
        manufacturer: {
          select: {
            id: true,
            name: true,
            type: true,
            country: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check for recent optimization (within last 7 days)
    const recentOptimization = await prisma.inventoryOptimization.findFirst({
      where: {
        productId,
        analyzedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { analyzedAt: 'desc' },
    });

    if (recentOptimization && recentOptimization.validUntil > new Date()) {
      return NextResponse.json({
        success: true,
        data: {
          ...recentOptimization,
          insights: JSON.parse(recentOptimization.insights),
        },
        cached: true,
        message: 'Using recent optimization analysis',
      });
    }

    // Fetch inventory records for stock analysis
    const inventoryRecords = await prisma.inventory.findMany({
      where: {
        productId,
      },
      orderBy: { receivedDate: 'desc' },
      take: 100,
      select: {
        id: true,
        quantity: true,
        availableQuantity: true,
        reservedQuantity: true,
        status: true,
        receivedDate: true,
        expiryDate: true,
      },
    });

    // Calculate current stock level from all inventory records
    const currentStock = inventoryRecords.reduce(
      (sum: number, inv) => sum + inv.availableQuantity,
      0
    );
    const totalQuantity = inventoryRecords.reduce((sum: number, inv) => sum + inv.quantity, 0);
    const reservedStock = inventoryRecords.reduce(
      (sum: number, inv) => sum + inv.reservedQuantity,
      0
    );

    // For demand forecasting, we'll analyze inventory turnover patterns
    // Group by month of receipt to estimate demand
    const receiptsByMonth = new Map<string, number>();
    inventoryRecords
      .filter(inv => inv.receivedDate)
      .forEach(inv => {
        const monthKey = inv.receivedDate!.toISOString().substring(0, 7); // YYYY-MM
        receiptsByMonth.set(monthKey, (receiptsByMonth.get(monthKey) || 0) + inv.quantity);
      });

    const monthlyDemand = Array.from(receiptsByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, quantity]) => ({ month, quantity }));

    // Build AI prompt
    const systemPrompt = `You are an inventory optimization expert specializing in medical device distribution.

Your task is to:
1. Forecast demand based on historical sales patterns
2. Identify demand trends and seasonality
3. Calculate optimal reorder points and quantities
4. Estimate stockout risks and carrying costs
5. Provide actionable insights for inventory management

Respond ONLY with valid JSON matching this exact structure:
{
  "predictedDemand": 150,
  "demandTrend": "INCREASING",
  "seasonalityFactor": 1.2,
  "recommendedReorderPoint": 50,
  "recommendedOrderQty": 100,
  "recommendedSafetyStock": 30,
  "estimatedStockoutRisk": 25.5,
  "estimatedCarryingCost": 1200.00,
  "potentialCostSavings": 500.00,
  "confidenceScore": 85.0,
  "insights": [
    "Demand shows 15% month-over-month growth",
    "Seasonal peak expected in Q2",
    "Current stock sufficient for 2.5 months",
    "Consider bulk ordering to reduce unit costs"
  ]
}

Trends: INCREASING, DECREASING, STABLE, SEASONAL`;

    const userPrompt = `Analyze this product inventory:

**Product Details:**
- SKU: ${product.sku}
- Name: ${product.name}
- Category: ${product.category || 'N/A'} / ${product.subCategory || 'N/A'}
- Manufacturer: ${product.manufacturer?.name || 'Unknown'}
- Current Stock: ${currentStock} ${product.unitOfMeasure || 'units'}
- Min Stock Level: ${product.minStockLevel}
- Max Stock Level: ${product.maxStockLevel || 'N/A'}
- Current Reorder Point: ${product.reorderPoint || 'Not set'}
- Lead Time: ${product.leadTimeDays || 'Unknown'} days
- Cost Price: ${product.costPrice} ${product.currency}
- Selling Price: ${product.sellingPrice} ${product.currency}

**Inventory Data (last 100 records):**
Total Records: ${inventoryRecords.length}
Current Available Stock: ${currentStock} units
Reserved Stock: ${reservedStock} units
Total Quantity: ${totalQuantity} units

**Monthly Demand Pattern:**
${
  monthlyDemand.length > 0
    ? monthlyDemand.map(d => `${d.month}: ${d.quantity} units`).join('\n')
    : 'No sales history available'
}

**Analysis Requirements:**
1. Forecast next month's demand based on historical patterns
2. Identify if demand is INCREASING, DECREASING, STABLE, or SEASONAL
3. Calculate seasonality factor (1.0 = no seasonality)
4. Recommend optimal reorder point (when to order)
5. Recommend order quantity (how much to order)
6. Calculate safety stock needed (buffer for uncertainty)
7. Estimate stockout risk as percentage (0-100)
8. Estimate monthly carrying cost (storage, insurance, depreciation)
9. Calculate potential cost savings from optimization
10. Provide 4-6 actionable insights

**Cost Calculation Guidelines:**
- Carrying cost: ~2-3% of product value per month
- Stockout cost: lost sales + customer dissatisfaction
- Ordering cost: shipping + processing overhead
- Target service level: 95% (5% acceptable stockout risk)

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
    let optimizationData: any;
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
      optimizationData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Provide default fallback
      const avgMonthlyDemand =
        monthlyDemand.length > 0
          ? monthlyDemand.reduce((sum, d) => sum + d.quantity, 0) / monthlyDemand.length
          : 0;

      optimizationData = {
        predictedDemand: Math.ceil(avgMonthlyDemand || currentStock * 0.2),
        demandTrend: 'STABLE',
        seasonalityFactor: 1.0,
        recommendedReorderPoint: product.reorderPoint || product.minStockLevel,
        recommendedOrderQty: Math.ceil((avgMonthlyDemand || currentStock) * 1.5),
        recommendedSafetyStock: product.minStockLevel || Math.ceil(currentStock * 0.2),
        estimatedStockoutRisk: currentStock < product.minStockLevel ? 75 : 15,
        estimatedCarryingCost: product.costPrice
          ? Number(product.costPrice) * currentStock * 0.025
          : 0,
        potentialCostSavings: 0,
        confidenceScore: 40,
        insights: [
          'AI analysis failed, using fallback calculations',
          `Current stock: ${currentStock} units`,
          `Average monthly demand: ${avgMonthlyDemand.toFixed(1)} units`,
          'Manual review recommended for accurate forecasting',
        ],
      };
    }

    // Save optimization to database
    const optimization = await prisma.inventoryOptimization.create({
      data: {
        productId,
        predictedDemand: optimizationData.predictedDemand || 0,
        demandTrend: optimizationData.demandTrend || 'STABLE',
        seasonalityFactor: optimizationData.seasonalityFactor || 1.0,
        recommendedReorderPoint: optimizationData.recommendedReorderPoint || product.minStockLevel,
        recommendedOrderQty: optimizationData.recommendedOrderQty || 0,
        recommendedSafetyStock: optimizationData.recommendedSafetyStock || product.minStockLevel,
        estimatedStockoutRisk: optimizationData.estimatedStockoutRisk || 0,
        estimatedCarryingCost: optimizationData.estimatedCarryingCost || 0,
        potentialCostSavings: optimizationData.potentialCostSavings || 0,
        dataPoints: inventoryRecords.length,
        confidenceScore: optimizationData.confidenceScore || 0,
        insights: JSON.stringify(optimizationData.insights || []),
        aiProvider: aiResponse.model || 'gemini',
        aiModel: aiResponse.model || 'gemini-1.5-flash-002',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      },
      include: {
        product: {
          select: {
            sku: true,
            name: true,
            unitOfMeasure: true,
            manufacturer: { select: { name: true } },
          },
        },
      },
    });

    const processingTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...optimization,
        insights: JSON.parse(optimization.insights),
        currentStock,
        monthsOfStockRemaining:
          optimizationData.predictedDemand > 0
            ? (currentStock / optimizationData.predictedDemand).toFixed(1)
            : 'N/A',
      },
      cached: false,
      processingTimeMs,
    });
  } catch (error) {
    console.error('Inventory optimization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to optimize inventory',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing optimization
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const optimization = await prisma.inventoryOptimization.findFirst({
      where: { productId: id },
      orderBy: { analyzedAt: 'desc' },
      include: {
        product: {
          select: {
            sku: true,
            name: true,
            category: true,
            unitOfMeasure: true,
            minStockLevel: true,
            reorderPoint: true,
            manufacturer: { select: { name: true } },
          },
        },
      },
    });

    if (!optimization) {
      return NextResponse.json({ error: 'Optimization not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...optimization,
        insights: JSON.parse(optimization.insights),
        isExpired: optimization.validUntil < new Date(),
      },
    });
  } catch (error) {
    console.error('Get optimization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve optimization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
