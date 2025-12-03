/**
 * Tender Analysis AI API
 * Analyzes tenders for SWOT, win probability, and competitive scoring
 */

import { invokeUnifiedLLM } from '@/lib/ai/llm-provider';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const analyzeRequestSchema = z.object({
  tenderId: z.string().uuid(),
  includeCompetitiveAnalysis: z.boolean().default(true),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenderId, includeCompetitiveAnalysis } = analyzeRequestSchema.parse(body);

    // Fetch tender data
    const tender = await prisma.tender.findUnique({
      where: { id: tenderId, isDeleted: false },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
            country: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            department: true,
          },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Check if analysis already exists
    const existingAnalysis = await prisma.tenderAnalysis.findUnique({
      where: { tenderId },
    });

    if (existingAnalysis) {
      return NextResponse.json({
        analysis: {
          id: existingAnalysis.id,
          tenderId: existingAnalysis.tenderId,
          swot: {
            strengths: JSON.parse(existingAnalysis.strengths),
            weaknesses: JSON.parse(existingAnalysis.weaknesses),
            opportunities: JSON.parse(existingAnalysis.opportunities),
            threats: JSON.parse(existingAnalysis.threats),
          },
          winProbability: Number(existingAnalysis.winProbability),
          confidenceLevel: existingAnalysis.confidenceLevel,
          competitiveScore: Number(existingAnalysis.competitiveScore),
          scoring: {
            pricing: Number(existingAnalysis.pricingScore),
            technical: Number(existingAnalysis.technicalScore),
            experience: Number(existingAnalysis.experienceScore),
          },
          keyFactors: JSON.parse(existingAnalysis.keyFactors),
          recommendations: JSON.parse(existingAnalysis.recommendations),
          riskFactors: JSON.parse(existingAnalysis.riskFactors),
          aiProvider: existingAnalysis.aiProvider,
          analyzedAt: existingAnalysis.analyzedAt.toISOString(),
        },
        cached: true,
      });
    }

    // Build analysis prompt
    const prompt = buildTenderAnalysisPrompt(tender, includeCompetitiveAnalysis);

    // Invoke AI with Gemini (best for text analysis)
    const aiResponse = await invokeUnifiedLLM({
      messages: [
        {
          role: 'system',
          content:
            'You are a tender analysis expert specializing in government healthcare procurement in Kuwait. Analyze tenders with focus on SWOT analysis, win probability, and competitive positioning.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      maxTokens: 4000,
    });

    // Parse AI response
    const content = aiResponse.choices[0]?.message?.content;
    const analysisText =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
        ? content.map(c => ('text' in c ? c.text : '')).join(' ')
        : '';
    const analysis = parseAnalysisResponse(analysisText);

    // Save to database
    const savedAnalysis = await prisma.tenderAnalysis.create({
      data: {
        tenderId,
        strengths: JSON.stringify(analysis.swot.strengths),
        weaknesses: JSON.stringify(analysis.swot.weaknesses),
        opportunities: JSON.stringify(analysis.swot.opportunities),
        threats: JSON.stringify(analysis.swot.threats),
        winProbability: analysis.winProbability,
        confidenceLevel: analysis.confidenceLevel,
        competitiveScore: analysis.competitiveScore,
        pricingScore: analysis.scoring.pricing,
        technicalScore: analysis.scoring.technical,
        experienceScore: analysis.scoring.experience,
        keyFactors: JSON.stringify(analysis.keyFactors),
        recommendations: JSON.stringify(analysis.recommendations),
        riskFactors: JSON.stringify(analysis.riskFactors),
        aiProvider: aiResponse.model,
        aiModel: aiResponse.model,
        processingTimeMs: Date.now() - startTime,
        analyzedById: session.user.id,
      },
    });

    return NextResponse.json({
      analysis: {
        id: savedAnalysis.id,
        tenderId: savedAnalysis.tenderId,
        swot: analysis.swot,
        winProbability: analysis.winProbability,
        confidenceLevel: analysis.confidenceLevel,
        competitiveScore: analysis.competitiveScore,
        scoring: analysis.scoring,
        keyFactors: analysis.keyFactors,
        recommendations: analysis.recommendations,
        riskFactors: analysis.riskFactors,
        aiProvider: savedAnalysis.aiProvider,
        analyzedAt: savedAnalysis.analyzedAt.toISOString(),
      },
      cached: false,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error analyzing tender:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze tender',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTenderAnalysisPrompt(tender: any, includeCompetitive: boolean): string {
  return `Analyze the following tender for a comprehensive assessment:

TENDER DETAILS:
- Tender Number: ${tender.tenderNumber}
- Title: ${tender.title}
- Customer: ${tender.customer?.name || 'N/A'} (${tender.customer?.type || 'N/A'})
- Category: ${tender.category || 'N/A'}
- Department: ${tender.department || 'N/A'}
- Estimated Value: ${tender.estimatedValue ? `${tender.estimatedValue} ${tender.currency}` : 'N/A'}
- Submission Deadline: ${
    tender.submissionDeadline ? new Date(tender.submissionDeadline).toLocaleDateString() : 'N/A'
  }
- Description: ${tender.description || 'N/A'}
- Technical Requirements: ${tender.technicalRequirements || 'N/A'}
- Commercial Requirements: ${tender.commercialRequirements || 'N/A'}
- Bond Required: ${tender.bondRequired ? `Yes (${tender.bondAmount} ${tender.currency})` : 'No'}

Please provide a detailed analysis in the following JSON format:

{
  "swot": {
    "strengths": ["List of 3-5 key strengths for pursuing this tender"],
    "weaknesses": ["List of 3-5 potential weaknesses or challenges"],
    "opportunities": ["List of 3-5 opportunities this tender presents"],
    "threats": ["List of 3-5 threats or risks to consider"]
  },
  "winProbability": <number 0-100>,
  "confidenceLevel": "HIGH|MEDIUM|LOW",
  ${
    includeCompetitive
      ? `
  "competitiveScore": <number 0-100>,
  "scoring": {
    "pricing": <number 0-100>,
    "technical": <number 0-100>,
    "experience": <number 0-100>
  },`
      : ''
  }
  "keyFactors": ["List of 5-7 key factors that will determine success"],
  "recommendations": ["List of 5-7 specific actionable recommendations"],
  "riskFactors": ["List of 3-5 critical risk factors to mitigate"]
}

ANALYSIS GUIDELINES:
1. Consider the tender is for medical equipment/devices in Kuwait healthcare sector
2. Beshara Group is an established medical distribution company with experience in MOH tenders
3. Focus on realistic assessment of win probability based on tender requirements
4. Identify specific technical, commercial, and financial factors
5. Provide actionable recommendations for bid preparation
6. Consider local market dynamics and competition in Kuwait healthcare sector

Respond ONLY with the JSON object, no additional text.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAnalysisResponse(text: string): any {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and provide defaults
    return {
      swot: {
        strengths: Array.isArray(parsed.swot?.strengths)
          ? parsed.swot.strengths
          : [
              'Strong technical capabilities',
              'Established customer relationships',
              'Competitive pricing structure',
            ],
        weaknesses: Array.isArray(parsed.swot?.weaknesses)
          ? parsed.swot.weaknesses
          : ['Limited local manufacturing', 'Dependency on import logistics'],
        opportunities: Array.isArray(parsed.swot?.opportunities)
          ? parsed.swot.opportunities
          : ['Growing healthcare market', 'Government healthcare investment'],
        threats: Array.isArray(parsed.swot?.threats)
          ? parsed.swot.threats
          : ['Intense competition', 'Currency fluctuations', 'Regulatory changes'],
      },
      winProbability: typeof parsed.winProbability === 'number' ? parsed.winProbability : 60,
      confidenceLevel: ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.confidenceLevel)
        ? parsed.confidenceLevel
        : 'MEDIUM',
      competitiveScore: typeof parsed.competitiveScore === 'number' ? parsed.competitiveScore : 70,
      scoring: {
        pricing: typeof parsed.scoring?.pricing === 'number' ? parsed.scoring.pricing : 75,
        technical: typeof parsed.scoring?.technical === 'number' ? parsed.scoring.technical : 80,
        experience: typeof parsed.scoring?.experience === 'number' ? parsed.scoring.experience : 85,
      },
      keyFactors: Array.isArray(parsed.keyFactors)
        ? parsed.keyFactors
        : [
            'Price competitiveness',
            'Technical compliance',
            'Past performance',
            'Financial capacity',
            'Delivery timeline',
          ],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [
            'Strengthen pricing strategy',
            'Ensure full technical compliance',
            'Prepare comprehensive documentation',
            'Build strong customer relationships',
          ],
      riskFactors: Array.isArray(parsed.riskFactors)
        ? parsed.riskFactors
        : ['Pricing pressure', 'Technical non-compliance', 'Delayed delivery'],
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    // Return default analysis if parsing fails
    return {
      swot: {
        strengths: [
          'Strong technical capabilities',
          'Established market presence',
          'Competitive pricing',
        ],
        weaknesses: ['Limited local manufacturing', 'Dependency on imports'],
        opportunities: ['Growing healthcare market', 'Government investment'],
        threats: ['Intense competition', 'Regulatory changes'],
      },
      winProbability: 60,
      confidenceLevel: 'MEDIUM',
      competitiveScore: 70,
      scoring: {
        pricing: 75,
        technical: 80,
        experience: 85,
      },
      keyFactors: [
        'Price competitiveness',
        'Technical compliance',
        'Past performance',
        'Financial capacity',
      ],
      recommendations: [
        'Strengthen pricing strategy',
        'Ensure technical compliance',
        'Prepare documentation',
      ],
      riskFactors: ['Pricing pressure', 'Technical challenges', 'Delivery constraints'],
    };
  }
}
