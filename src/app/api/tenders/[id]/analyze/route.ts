/**
 * Tender Analysis AI API
 * SWOT analysis, win probability, and competitive scoring
 */

import { getRecommendedProvider, invokeUnifiedLLM } from '@/lib/ai/llm-provider';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rateLimiter, RateLimitPresets } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TenderAnalysis {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  winProbability: {
    score: number; // 0-100
    confidence: number;
    factors: {
      name: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
      description: string;
    }[];
  };
  competitiveScore: {
    overall: number; // 0-100
    breakdown: {
      priceCompetitiveness: number;
      technicalCapability: number;
      deliveryCapacity: number;
      pastPerformance: number;
      compliance: number;
    };
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
  }[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigations: string[];
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Fetch tender data
    const tender = await prisma.tender.findUnique({
      where: { id, isDeleted: false },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Fetch historical tender data for context
    const historicalTenders = await prisma.tender.findMany({
      where: {
        isDeleted: false,
        status: { in: ['WON', 'LOST'] },
        department: tender.department,
      },
      select: {
        status: true,
        estimatedValue: true,
        department: true,
      },
      take: 20,
    });

    // Calculate historical win rate
    const wonCount = historicalTenders.filter(t => t.status === 'WON').length;
    const totalDecided = historicalTenders.length;
    const historicalWinRate = totalDecided > 0 ? (wonCount / totalDecided) * 100 : 50;

    // Build AI prompt
    const prompt = `You are a tender analysis expert for medical distribution companies in Kuwait. Analyze this tender opportunity and provide comprehensive insights.

**Tender Details:**
- Title: ${tender.title}
- Tender Number: ${tender.tenderNumber}
- Department: ${tender.department || 'Not specified'}
- Category: ${tender.category || 'Not specified'}
- Estimated Value: ${tender.estimatedValue ? `${Number(tender.estimatedValue).toLocaleString()} KWD` : 'Not specified'}
- Submission Deadline: ${tender.submissionDeadline ? new Date(tender.submissionDeadline).toLocaleDateString() : 'Not specified'}
- Status: ${tender.status}
- Description: ${tender.description || 'No description'}
- Technical Requirements: ${tender.technicalRequirements || 'Not specified'}
- Commercial Requirements: ${tender.commercialRequirements || 'Not specified'}
- Products: ${tender.products ? JSON.stringify(tender.products).substring(0, 200) : 'Not specified'}

**Historical Performance:**
- Win Rate for ${tender.department || 'this department'}: ${historicalWinRate.toFixed(1)}%
- Total Similar Tenders: ${totalDecided}

**Company Context:**
- Medical equipment distributor in Kuwait
- Primary clients: Ministry of Health, government hospitals
- Strengths: Established relationships, local presence, certified products

**Provide analysis in this EXACT JSON format (no markdown, no code blocks):**
{
  "swot": {
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "threats": ["threat 1", "threat 2"]
  },
  "winProbability": {
    "score": <0-100>,
    "confidence": <0-100>,
    "factors": [
      {
        "name": "factor name",
        "impact": "positive|negative|neutral",
        "weight": <0-100>,
        "description": "brief description"
      }
    ]
  },
  "competitiveScore": {
    "overall": <0-100>,
    "breakdown": {
      "priceCompetitiveness": <0-100>,
      "technicalCapability": <0-100>,
      "deliveryCapacity": <0-100>,
      "pastPerformance": <0-100>,
      "compliance": <0-100>
    }
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "specific action to take",
      "rationale": "why this matters"
    }
  ],
  "riskAssessment": {
    "level": "low|medium|high|critical",
    "factors": ["risk factor 1", "risk factor 2"],
    "mitigations": ["mitigation strategy 1", "mitigation strategy 2"]
  }
}`;

    const provider = await getRecommendedProvider('text');

    const result = await invokeUnifiedLLM(
      {
        messages: [
          {
            role: 'system',
            content: 'You are a tender analysis expert. Return only valid JSON, no markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        maxTokens: 3000,
      },
      { provider }
    );

    let analysis: TenderAnalysis;
    try {
      const content = result.choices[0].message.content as string;
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      analysis = JSON.parse(cleanContent);
    } catch {
      // Return fallback analysis
      analysis = {
        swot: {
          strengths: [
            'Established presence in Kuwait medical market',
            'Strong relationships with MOH',
            'Certified product portfolio',
          ],
          weaknesses: [
            'Limited historical data for this tender type',
            'Potential capacity constraints',
          ],
          opportunities: [
            'Growing healthcare sector in Kuwait',
            'Government investment in medical infrastructure',
          ],
          threats: [
            'Competitive pricing from international suppliers',
            'Regulatory changes',
          ],
        },
        winProbability: {
          score: Math.round(historicalWinRate),
          confidence: 60,
          factors: [
            {
              name: 'Historical Win Rate',
              impact: historicalWinRate > 50 ? 'positive' : 'negative',
              weight: 30,
              description: `Based on ${totalDecided} similar tenders`,
            },
            {
              name: 'Market Position',
              impact: 'positive',
              weight: 25,
              description: 'Established local distributor',
            },
          ],
        },
        competitiveScore: {
          overall: 65,
          breakdown: {
            priceCompetitiveness: 60,
            technicalCapability: 70,
            deliveryCapacity: 65,
            pastPerformance: 70,
            compliance: 75,
          },
        },
        recommendations: [
          {
            priority: 'high',
            action: 'Review pricing strategy against market benchmarks',
            rationale: 'Price is often the deciding factor in government tenders',
          },
          {
            priority: 'medium',
            action: 'Prepare comprehensive technical documentation',
            rationale: 'Demonstrates capability and reduces evaluation risk',
          },
        ],
        riskAssessment: {
          level: 'medium',
          factors: [
            'Competitive market conditions',
            'Timeline constraints',
          ],
          mitigations: [
            'Early supplier engagement',
            'Dedicated bid team assignment',
          ],
        },
      };
    }

    // Note: Analysis results can be stored using the TenderAnalysis model
    // This is handled separately if needed

    return NextResponse.json({
      success: true,
      data: analysis,
      metadata: {
        tenderId: id,
        tenderNumber: tender.tenderNumber,
        analyzedAt: new Date().toISOString(),
        provider,
        historicalDataPoints: totalDecided,
      },
    });
  } catch (error) {
    console.error('Tender analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze tender' },
      { status: 500 }
    );
  }
}
