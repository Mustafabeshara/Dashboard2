/**
 * Inventory Optimization AI API
 * Demand forecasting, reorder recommendations, and stock optimization
 */

import { getRecommendedProvider, invokeUnifiedLLM } from '@/lib/ai/llm-provider';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rateLimiter, RateLimitPresets } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface OptimizationResult {
  demandForecast: {
    nextMonth: number;
    next3Months: number;
    next6Months: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  };
  reorderRecommendations: Array<{
    productId: string;
    productName: string;
    sku: string;
    currentStock: number;
    reorderPoint: number;
    suggestedOrderQty: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    estimatedCost: number;
    reason: string;
  }>;
  stockOptimization: {
    overstock: Array<{
      productId: string;
      productName: string;
      excessQty: number;
      tiedUpCapital: number;
      recommendation: string;
    }>;
    understock: Array<{
      productId: string;
      productName: string;
      shortfallQty: number;
      riskLevel: 'high' | 'medium' | 'low';
      recommendation: string;
    }>;
    expiringItems: Array<{
      productId: string;
      productName: string;
      qty: number;
      expiryDate: string;
      daysUntilExpiry: number;
      recommendation: string;
    }>;
  };
  insights: Array<{
    type: 'opportunity' | 'risk' | 'recommendation' | 'trend';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
  metrics: {
    turnoverRate: number;
    stockoutRisk: number;
    inventoryHealth: number;
    potentialSavings: number;
  };
}

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

    // Fetch current inventory with product details
    const inventory = await prisma.inventory.findMany({
      where: { status: { not: 'EXPIRED' } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            minStockLevel: true,
            maxStockLevel: true,
            reorderPoint: true,
            sellingPrice: true,
          },
        },
      },
    });

    if (inventory.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          demandForecast: { nextMonth: 0, next3Months: 0, next6Months: 0, confidence: 0, trend: 'stable' },
          reorderRecommendations: [],
          stockOptimization: { overstock: [], understock: [], expiringItems: [] },
          insights: [{ type: 'recommendation', title: 'No inventory data', description: 'Add inventory items to get AI optimization insights', impact: 'high', actionable: true }],
          metrics: { turnoverRate: 0, stockoutRisk: 0, inventoryHealth: 0, potentialSavings: 0 },
        },
      });
    }

    // Calculate inventory statistics
    const totalValue = inventory.reduce((sum, inv) => sum + Number(inv.totalValue || 0), 0);
    const totalItems = inventory.reduce((sum, inv) => sum + inv.quantity, 0);

    // Items expiring within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringItems = inventory.filter(inv =>
      inv.expiryDate && new Date(inv.expiryDate) <= thirtyDaysFromNow
    );

    // Items below reorder point
    const lowStockItems = inventory.filter(inv =>
      inv.product.reorderPoint && inv.availableQuantity <= inv.product.reorderPoint
    );

    // Items below minimum
    const criticalItems = inventory.filter(inv =>
      inv.availableQuantity < (inv.product.minStockLevel || 10)
    );

    // Overstocked items (above max)
    const overstockItems = inventory.filter(inv =>
      inv.product.maxStockLevel && inv.availableQuantity > inv.product.maxStockLevel
    );

    // Build AI prompt
    const prompt = `You are an inventory optimization AI for a medical distribution company in Kuwait.

**Current Inventory Overview:**
- Total Items: ${totalItems}
- Total Value: ${totalValue.toLocaleString()} KWD
- Unique Products: ${inventory.length}
- Critical Low Stock: ${criticalItems.length} items
- Below Reorder Point: ${lowStockItems.length} items
- Overstocked: ${overstockItems.length} items
- Expiring Soon (30 days): ${expiringItems.length} items

**Products Needing Attention:**
${criticalItems.slice(0, 10).map(inv => `
- ${inv.product.name} (${inv.product.sku})
  Stock: ${inv.availableQuantity} / Min: ${inv.product.minStockLevel}
  Category: ${inv.product.category || 'General'}
  Unit Price: ${inv.product.sellingPrice || 'N/A'} KWD
`).join('')}

**Overstocked Items:**
${overstockItems.slice(0, 5).map(inv => `
- ${inv.product.name}: ${inv.availableQuantity} (Max: ${inv.product.maxStockLevel})
  Excess Value: ${((inv.availableQuantity - (inv.product.maxStockLevel || 0)) * Number(inv.unitCost || 0)).toFixed(2)} KWD
`).join('')}

**Expiring Items:**
${expiringItems.slice(0, 5).map(inv => `
- ${inv.product.name}: ${inv.quantity} units expiring ${inv.expiryDate ? new Date(inv.expiryDate).toLocaleDateString() : 'soon'}
`).join('')}

**Business Context:**
- Medical equipment distributor in Kuwait
- Primary customers: MOH, government hospitals
- Need to maintain adequate stock for tenders
- Storage costs and expiry are key concerns

**Provide optimization analysis in this EXACT JSON format (no markdown):**
{
  "demandForecast": {
    "nextMonth": <estimated units>,
    "next3Months": <estimated units>,
    "next6Months": <estimated units>,
    "confidence": <0-100>,
    "trend": "increasing|decreasing|stable|seasonal"
  },
  "reorderRecommendations": [
    {
      "productId": "string",
      "productName": "string",
      "sku": "string",
      "currentStock": <number>,
      "reorderPoint": <number>,
      "suggestedOrderQty": <number>,
      "urgency": "critical|high|medium|low",
      "estimatedCost": <number>,
      "reason": "brief reason"
    }
  ],
  "stockOptimization": {
    "overstock": [
      {
        "productId": "string",
        "productName": "string",
        "excessQty": <number>,
        "tiedUpCapital": <number>,
        "recommendation": "what to do"
      }
    ],
    "understock": [
      {
        "productId": "string",
        "productName": "string",
        "shortfallQty": <number>,
        "riskLevel": "high|medium|low",
        "recommendation": "what to do"
      }
    ],
    "expiringItems": [
      {
        "productId": "string",
        "productName": "string",
        "qty": <number>,
        "expiryDate": "YYYY-MM-DD",
        "daysUntilExpiry": <number>,
        "recommendation": "what to do"
      }
    ]
  },
  "insights": [
    {
      "type": "opportunity|risk|recommendation|trend",
      "title": "brief title",
      "description": "detailed insight",
      "impact": "high|medium|low",
      "actionable": true|false
    }
  ],
  "metrics": {
    "turnoverRate": <0-10>,
    "stockoutRisk": <0-100>,
    "inventoryHealth": <0-100>,
    "potentialSavings": <number in KWD>
  }
}`;

    try {
      const provider = await getRecommendedProvider('text');

      const result = await invokeUnifiedLLM(
        {
          messages: [
            {
              role: 'system',
              content: 'You are an inventory optimization AI. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          maxTokens: 4000,
        },
        { provider }
      );

      let optimization: OptimizationResult;
      try {
        const content = result.choices[0].message.content as string;
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        optimization = JSON.parse(cleanContent);
      } catch {
        // Generate fallback optimization based on data analysis
        optimization = generateFallbackOptimization(
          inventory,
          criticalItems,
          lowStockItems,
          overstockItems,
          expiringItems,
          totalValue
        );
      }

      return NextResponse.json({
        success: true,
        data: optimization,
        metadata: {
          generatedAt: new Date().toISOString(),
          provider,
          dataPoints: {
            totalProducts: inventory.length,
            criticalItems: criticalItems.length,
            lowStock: lowStockItems.length,
            expiringSoon: expiringItems.length,
          },
        },
      });
    } catch (aiError) {
      // Return fallback optimization
      const optimization = generateFallbackOptimization(
        inventory,
        criticalItems,
        lowStockItems,
        overstockItems,
        expiringItems,
        totalValue
      );

      return NextResponse.json({
        success: true,
        data: optimization,
        metadata: {
          generatedAt: new Date().toISOString(),
          provider: 'statistical-fallback',
          dataPoints: {
            totalProducts: inventory.length,
            criticalItems: criticalItems.length,
            lowStock: lowStockItems.length,
            expiringSoon: expiringItems.length,
          },
        },
        warning: `AI unavailable: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
      });
    }
  } catch (error) {
    console.error('Inventory optimization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize inventory' },
      { status: 500 }
    );
  }
}

function generateFallbackOptimization(
  inventory: any[],
  criticalItems: any[],
  lowStockItems: any[],
  overstockItems: any[],
  expiringItems: any[],
  totalValue: number
): OptimizationResult {
  const now = new Date();

  return {
    demandForecast: {
      nextMonth: Math.round(inventory.reduce((sum, inv) => sum + inv.quantity, 0) * 0.15),
      next3Months: Math.round(inventory.reduce((sum, inv) => sum + inv.quantity, 0) * 0.45),
      next6Months: Math.round(inventory.reduce((sum, inv) => sum + inv.quantity, 0) * 0.9),
      confidence: 60,
      trend: 'stable',
    },
    reorderRecommendations: criticalItems.slice(0, 10).map(inv => ({
      productId: inv.product.id,
      productName: inv.product.name,
      sku: inv.product.sku,
      currentStock: inv.availableQuantity,
      reorderPoint: inv.product.reorderPoint || inv.product.minStockLevel,
      suggestedOrderQty: Math.max(
        (inv.product.maxStockLevel || inv.product.minStockLevel * 3) - inv.availableQuantity,
        inv.product.minStockLevel
      ),
      urgency: inv.availableQuantity === 0 ? 'critical' as const :
               inv.availableQuantity < (inv.product.minStockLevel * 0.5) ? 'high' as const : 'medium' as const,
      estimatedCost: ((inv.product.maxStockLevel || inv.product.minStockLevel * 3) - inv.availableQuantity) * Number(inv.unitCost || inv.product.sellingPrice || 0),
      reason: `Stock ${inv.availableQuantity} below minimum ${inv.product.minStockLevel}`,
    })),
    stockOptimization: {
      overstock: overstockItems.slice(0, 5).map(inv => ({
        productId: inv.product.id,
        productName: inv.product.name,
        excessQty: inv.availableQuantity - (inv.product.maxStockLevel || 0),
        tiedUpCapital: (inv.availableQuantity - (inv.product.maxStockLevel || 0)) * Number(inv.unitCost || 0),
        recommendation: 'Consider promotional pricing or redistribution',
      })),
      understock: lowStockItems.slice(0, 5).map(inv => ({
        productId: inv.product.id,
        productName: inv.product.name,
        shortfallQty: (inv.product.reorderPoint || inv.product.minStockLevel) - inv.availableQuantity,
        riskLevel: inv.availableQuantity === 0 ? 'high' as const : 'medium' as const,
        recommendation: 'Place reorder immediately',
      })),
      expiringItems: expiringItems.slice(0, 5).map(inv => {
        const expiry = inv.expiryDate ? new Date(inv.expiryDate) : now;
        const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          productId: inv.product.id,
          productName: inv.product.name,
          qty: inv.quantity,
          expiryDate: inv.expiryDate?.toISOString().split('T')[0] || '',
          daysUntilExpiry: Math.max(0, daysUntil),
          recommendation: daysUntil < 7 ? 'Urgent: Consider returns or disposal' : 'Prioritize for upcoming orders',
        };
      }),
    },
    insights: [
      ...(criticalItems.length > 0 ? [{
        type: 'risk' as const,
        title: `${criticalItems.length} Critical Stock Items`,
        description: `${criticalItems.length} products are below minimum stock levels and need immediate attention.`,
        impact: 'high' as const,
        actionable: true,
      }] : []),
      ...(expiringItems.length > 0 ? [{
        type: 'risk' as const,
        title: `${expiringItems.length} Items Expiring Soon`,
        description: `${expiringItems.length} products will expire within 30 days. Consider promotional sales or returns.`,
        impact: 'medium' as const,
        actionable: true,
      }] : []),
      ...(overstockItems.length > 0 ? [{
        type: 'opportunity' as const,
        title: 'Capital Optimization Opportunity',
        description: `${overstockItems.length} overstocked items are tying up capital. Consider redistributing or promotional pricing.`,
        impact: 'medium' as const,
        actionable: true,
      }] : []),
      {
        type: 'recommendation' as const,
        title: 'Regular Stock Review',
        description: 'Schedule weekly inventory reviews to maintain optimal stock levels.',
        impact: 'low' as const,
        actionable: true,
      },
    ],
    metrics: {
      turnoverRate: 4.2, // Industry average
      stockoutRisk: Math.min(100, (criticalItems.length / inventory.length) * 100 * 2),
      inventoryHealth: Math.max(0, 100 - (criticalItems.length * 5) - (expiringItems.length * 3) - (overstockItems.length * 2)),
      potentialSavings: overstockItems.reduce((sum, inv) =>
        sum + ((inv.availableQuantity - (inv.product.maxStockLevel || 0)) * Number(inv.unitCost || 0) * 0.1),
        0
      ),
    },
  };
}
