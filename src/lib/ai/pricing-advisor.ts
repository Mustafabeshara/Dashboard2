/**
 * AI Pricing Advisor
 * Provides intelligent pricing recommendations for tender bids
 * Analyzes market data, competitor pricing, and historical win rates
 */

import { invokeUnifiedLLM, LLMProvider } from './llm-provider';
import { sanitizePromptInput } from './prompt-sanitizer';
import prisma from '@/lib/prisma';

export interface PricingRecommendation {
  recommendedPrice: number;
  priceRange: {
    minimum: number;
    competitive: number;
    optimal: number;
    maximum: number;
  };
  confidence: number; // 0-100
  winProbability: number; // 0-100
  margin: {
    atRecommended: number;
    atCompetitive: number;
    atOptimal: number;
  };
  factors: PricingFactor[];
  competitors: CompetitorPricing[];
  recommendations: string[];
  warnings: string[];
}

export interface PricingFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-100
  description: string;
}

export interface CompetitorPricing {
  name?: string;
  estimatedPrice: number;
  source: 'historical' | 'market_intelligence' | 'similar_tender';
  confidence: number;
}

export interface MarketIntelligence {
  averageMarketPrice?: number;
  priceRange?: { min: number; max: number };
  trend: 'increasing' | 'stable' | 'decreasing';
  demandLevel: 'high' | 'medium' | 'low';
  competitionLevel: 'high' | 'medium' | 'low';
}

/**
 * Get historical pricing data for similar products/tenders
 */
async function getHistoricalPricing(params: {
  productDescription: string;
  category?: string;
  quantity?: number;
}): Promise<{
  averagePrice: number;
  priceRange: { min: number; max: number };
  sampleSize: number;
}> {
  try {
    // Get similar products from past tenders
    const historicalTenders = await prisma.tender.findMany({
      where: {
        isDeleted: false,
        status: { in: ['WON', 'LOST', 'AWARDED'] },
        ...(params.category ? { category: params.category } : {}),
      },
      include: {
        items: {
          select: {
            description: true,
            estimatedPrice: true,
            quantity: true,
          },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    // Extract relevant pricing data
    const prices: number[] = [];
    for (const tender of historicalTenders) {
      for (const item of tender.items) {
        if (item.estimatedPrice && item.estimatedPrice > 0) {
          // Basic text matching (could be enhanced with AI)
          const similarity = calculateTextSimilarity(
            params.productDescription.toLowerCase(),
            item.description.toLowerCase()
          );
          
          if (similarity > 0.5) {
            prices.push(Number(item.estimatedPrice));
          }
        }
      }
    }

    if (prices.length === 0) {
      return {
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        sampleSize: 0,
      };
    }

    const sortedPrices = prices.sort((a, b) => a - b);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    return {
      averagePrice: avgPrice,
      priceRange: {
        min: sortedPrices[0],
        max: sortedPrices[sortedPrices.length - 1],
      },
      sampleSize: prices.length,
    };
  } catch (error) {
    console.error('Failed to get historical pricing:', error);
    return {
      averagePrice: 0,
      priceRange: { min: 0, max: 0 },
      sampleSize: 0,
    };
  }
}

/**
 * Simple text similarity calculation (Jaccard similarity)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Get company's historical win rate by price competitiveness
 */
async function getWinRateByPricing(category?: string): Promise<{
  lowPriceWinRate: number;
  midPriceWinRate: number;
  highPriceWinRate: number;
}> {
  try {
    const tenders = await prisma.tender.findMany({
      where: {
        isDeleted: false,
        status: { in: ['WON', 'LOST'] },
        ...(category ? { category } : {}),
      },
      select: {
        status: true,
        estimatedValue: true,
      },
    });

    // This is simplified - in production, you'd compare against actual competitor prices
    const won = tenders.filter(t => t.status === 'WON');
    const total = tenders.length;

    return {
      lowPriceWinRate: total > 0 ? (won.length / total) * 100 : 50,
      midPriceWinRate: total > 0 ? (won.length / total) * 100 : 50,
      highPriceWinRate: total > 0 ? (won.length / total) * 100 : 50,
    };
  } catch (error) {
    console.error('Failed to get win rate:', error);
    return {
      lowPriceWinRate: 50,
      midPriceWinRate: 50,
      highPriceWinRate: 50,
    };
  }
}

/**
 * Generate pricing recommendation using AI
 */
export async function generatePricingRecommendation(params: {
  productDescription: string;
  category?: string;
  quantity: number;
  costPrice?: number;
  targetMargin?: number; // percentage
  tenderValue?: number;
  customerName?: string;
  competitorPrices?: number[];
}): Promise<PricingRecommendation> {
  const {
    productDescription,
    category,
    quantity,
    costPrice = 0,
    targetMargin = 20,
    tenderValue,
    customerName,
    competitorPrices = [],
  } = params;

  try {
    // Get historical data
    const historical = await getHistoricalPricing({
      productDescription,
      category,
      quantity,
    });

    const winRates = await getWinRateByPricing(category);

    // Sanitize inputs
    const sanitizedDesc = sanitizePromptInput(productDescription, { maxLength: 500 });
    const sanitizedCustomer = customerName
      ? sanitizePromptInput(customerName, { maxLength: 200 })
      : 'Unknown';

    const prompt = `You are a pricing strategy expert for medical equipment distribution in Kuwait. Provide pricing recommendations for a tender bid.

**PRODUCT DETAILS:**
Description: ${sanitizedDesc}
Category: ${category || 'Medical Equipment'}
Quantity: ${quantity}
Cost Price: ${costPrice > 0 ? `${costPrice} KWD` : 'Not provided'}
Target Margin: ${targetMargin}%

**MARKET CONTEXT:**
Customer: ${sanitizedCustomer}
Tender Value: ${tenderValue ? `${tenderValue} KWD` : 'Not specified'}
Historical Average Price: ${historical.averagePrice > 0 ? `${historical.averagePrice.toFixed(2)} KWD` : 'No data'}
Historical Price Range: ${historical.priceRange.min > 0 ? `${historical.priceRange.min.toFixed(2)} - ${historical.priceRange.max.toFixed(2)} KWD` : 'No data'}
Historical Data Points: ${historical.sampleSize}
Competitor Prices: ${competitorPrices.length > 0 ? competitorPrices.map(p => `${p} KWD`).join(', ') : 'Unknown'}

**HISTORICAL WIN RATES:**
Low Price Range: ${winRates.lowPriceWinRate.toFixed(1)}%
Mid Price Range: ${winRates.midPriceWinRate.toFixed(1)}%
High Price Range: ${winRates.highPriceWinRate.toFixed(1)}%

**PROVIDE ANALYSIS IN JSON FORMAT (no markdown):**
{
  "recommendedPrice": <number>,
  "priceRange": {
    "minimum": <lowest viable price>,
    "competitive": <price to beat competitors>,
    "optimal": <best balance of margin and win probability>,
    "maximum": <highest justifiable price>
  },
  "confidence": <0-100>,
  "winProbability": <0-100 at recommended price>,
  "margin": {
    "atRecommended": <margin % at recommended price>,
    "atCompetitive": <margin % at competitive price>,
    "atOptimal": <margin % at optimal price>
  },
  "factors": [
    {
      "name": "factor name",
      "impact": "positive|negative|neutral",
      "weight": <0-100>,
      "description": "brief explanation"
    }
  ],
  "recommendations": ["strategic recommendation 1", "recommendation 2"],
  "warnings": ["warning 1 if any", "warning 2"]
}

Consider:
1. Cost-plus margin vs market-based pricing
2. Win probability at different price points
3. Customer budget constraints
4. Competitive positioning
5. Volume discounts for large quantities
6. Historical success rates
`;

    const response = await invokeUnifiedLLM(
      {
        messages: [
          {
            role: 'system',
            content:
              'You are a pricing strategy expert. Provide detailed, data-driven pricing recommendations in valid JSON format only.',
          },
          { role: 'user', content: prompt },
        ],
        responseFormat: { type: 'json_object' },
      },
      { provider: LLMProvider.GEMINI }
    );

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('No response from AI');
    }

    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);

    // Add competitor pricing intel if available
    const competitors: CompetitorPricing[] = competitorPrices.map((price, idx) => ({
      name: `Competitor ${idx + 1}`,
      estimatedPrice: price,
      source: 'market_intelligence' as const,
      confidence: 70,
    }));

    return {
      recommendedPrice: result.recommendedPrice || costPrice * (1 + targetMargin / 100),
      priceRange: result.priceRange || {
        minimum: costPrice * 1.1,
        competitive: costPrice * 1.15,
        optimal: costPrice * 1.2,
        maximum: costPrice * 1.3,
      },
      confidence: result.confidence || 60,
      winProbability: result.winProbability || 50,
      margin: result.margin || {
        atRecommended: targetMargin,
        atCompetitive: targetMargin - 5,
        atOptimal: targetMargin,
      },
      factors: result.factors || [],
      competitors,
      recommendations: result.recommendations || [
        'Review competitor pricing before finalizing',
        'Consider volume discounts for large orders',
      ],
      warnings: result.warnings || [],
    };
  } catch (error) {
    console.error('Pricing recommendation failed:', error);
    
    // Fallback recommendation
    const fallbackPrice = costPrice > 0 ? costPrice * (1 + targetMargin / 100) : 0;
    
    return {
      recommendedPrice: fallbackPrice,
      priceRange: {
        minimum: costPrice * 1.1,
        competitive: costPrice * 1.15,
        optimal: costPrice * 1.2,
        maximum: costPrice * 1.3,
      },
      confidence: 40,
      winProbability: 50,
      margin: {
        atRecommended: targetMargin,
        atCompetitive: targetMargin - 5,
        atOptimal: targetMargin,
      },
      factors: [],
      competitors: [],
      recommendations: [
        'AI pricing analysis unavailable',
        'Review historical data manually',
        'Consult with sales team',
      ],
      warnings: ['AI pricing advisor is currently unavailable'],
    };
  }
}

/**
 * Analyze entire tender pricing strategy
 */
export async function analyzeTenderPricing(tenderId: string): Promise<{
  success: boolean;
  totalRecommendedPrice: number;
  totalCost: number;
  overallMargin: number;
  competitiveness: 'aggressive' | 'competitive' | 'conservative';
  itemRecommendations: Array<{
    itemId: string;
    itemDescription: string;
    recommendation: PricingRecommendation;
  }>;
  warnings: string[];
  error?: string;
}> {
  try {
    const tender = await prisma.tender.findUnique({
      where: { id: tenderId, isDeleted: false },
      include: {
        items: {
          where: { isDeleted: false },
          select: {
            id: true,
            description: true,
            quantity: true,
            unit: true,
            estimatedPrice: true,
            specifications: true,
          },
        },
        customer: {
          select: { name: true },
        },
      },
    });

    if (!tender) {
      throw new Error('Tender not found');
    }

    if (!tender.items || tender.items.length === 0) {
      throw new Error('No items in tender');
    }

    // Get pricing recommendations for each item
    const itemRecommendations = await Promise.all(
      tender.items.map(async (item) => ({
        itemId: item.id,
        itemDescription: item.description,
        recommendation: await generatePricingRecommendation({
          productDescription: item.description,
          category: tender.category || undefined,
          quantity: item.quantity,
          tenderValue: tender.estimatedValue ? Number(tender.estimatedValue) : undefined,
          customerName: tender.customer?.name,
        }),
      }))
    );

    // Cost estimation factor (90% of minimum price)
    // This assumes cost is typically 90% of the minimum viable selling price
    const COST_ESTIMATION_FACTOR = 0.9;

    // Create a map of item quantities for O(1) lookup
    const itemQuantityMap = new Map(
      tender.items.map(item => [item.id, item.quantity])
    );

    // Calculate totals
    const totalRecommended = itemRecommendations.reduce(
      (sum, item) => {
        const quantity = itemQuantityMap.get(item.itemId) || 0;
        return sum + item.recommendation.recommendedPrice * quantity;
      },
      0
    );

    const totalCost = itemRecommendations.reduce(
      (sum, item) => {
        const quantity = itemQuantityMap.get(item.itemId) || 0;
        // Estimate cost as percentage of minimum viable price
        return sum + item.recommendation.priceRange.minimum * COST_ESTIMATION_FACTOR * quantity;
      },
      0
    );

    const overallMargin = totalCost > 0 ? ((totalRecommended - totalCost) / totalRecommended) * 100 : 0;

    // Determine competitiveness
    let competitiveness: 'aggressive' | 'competitive' | 'conservative' = 'competitive';
    if (overallMargin < 15) {
      competitiveness = 'aggressive';
    } else if (overallMargin > 30) {
      competitiveness = 'conservative';
    }

    // Collect warnings
    const warnings: string[] = [];
    if (overallMargin < 10) {
      warnings.push('Very low margin - risk of unprofitable bid');
    }
    if (overallMargin > 40) {
      warnings.push('Very high margin - may lose to competitors');
    }

    const lowConfidenceItems = itemRecommendations.filter(
      (ir) => ir.recommendation.confidence < 60
    );
    if (lowConfidenceItems.length > 0) {
      warnings.push(`${lowConfidenceItems.length} item(s) have low confidence pricing - manual review recommended`);
    }

    return {
      success: true,
      totalRecommendedPrice: totalRecommended,
      totalCost,
      overallMargin,
      competitiveness,
      itemRecommendations,
      warnings,
    };
  } catch (error) {
    console.error('Tender pricing analysis failed:', error);
    return {
      success: false,
      totalRecommendedPrice: 0,
      totalCost: 0,
      overallMargin: 0,
      competitiveness: 'competitive',
      itemRecommendations: [],
      warnings: [],
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}
