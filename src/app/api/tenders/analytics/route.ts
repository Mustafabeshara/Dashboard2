/**
 * Tender Analytics API
 * AI-powered tender analysis and insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { callAI } from '@/lib/ai/ai-service-manager'
import { logger } from '@/lib/logger'

interface TenderInsights {
  summary: {
    totalTenders: number
    openTenders: number
    wonTenders: number
    lostTenders: number
    totalValue: number
    winRate: number
  }
  recentActivity: {
    newThisWeek: number
    closingSoon: number
    recentlyWon: number
  }
  aiAnalysis?: {
    marketTrends: string
    recommendations: string[]
    riskAlerts: string[]
    opportunityScore: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeAI = searchParams.get('includeAI') === 'true'

    // Get tender statistics
    const [
      totalCount,
      statusCounts,
      recentTenders,
      closingSoon,
      tenderValues,
    ] = await Promise.all([
      prisma.tender.count({ where: { isDeleted: false } }),
      prisma.tender.groupBy({
        by: ['status'],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      prisma.tender.count({
        where: {
          isDeleted: false,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.tender.count({
        where: {
          isDeleted: false,
          status: 'IN_PROGRESS',
          submissionDeadline: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.tender.findMany({
        where: { isDeleted: false },
        select: { estimatedValue: true, status: true },
      }),
    ])

    // Calculate statistics
    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {} as Record<string, number>)

    const wonCount = statusMap['WON'] || 0
    const lostCount = statusMap['LOST'] || 0
    const decidedCount = wonCount + lostCount
    const winRate = decidedCount > 0 ? Math.round((wonCount / decidedCount) * 100) : 0

    const totalValue = tenderValues.reduce((sum, t) => {
      return sum + (t.estimatedValue ? Number(t.estimatedValue) : 0)
    }, 0)

    const insights: TenderInsights = {
      summary: {
        totalTenders: totalCount,
        openTenders: (statusMap['DRAFT'] || 0) + (statusMap['IN_PROGRESS'] || 0) + (statusMap['SUBMITTED'] || 0),
        wonTenders: wonCount,
        lostTenders: lostCount,
        totalValue,
        winRate,
      },
      recentActivity: {
        newThisWeek: recentTenders,
        closingSoon,
        recentlyWon: 0, // Would need a more specific query
      },
    }

    // Generate AI analysis if requested
    if (includeAI) {
      try {
        // Get recent tenders for context
        const recentTenderData = await prisma.tender.findMany({
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            tenderNumber: true,
            title: true,
            status: true,
            estimatedValue: true,
            department: true,
            submissionDeadline: true,
          },
        })

        const prompt = `Analyze this tender portfolio and provide strategic insights:

Tender Statistics:
- Total Tenders: ${totalCount}
- Win Rate: ${winRate}%
- Open Tenders: ${insights.summary.openTenders}
- Closing Soon: ${closingSoon}

Recent Tenders:
${recentTenderData.map(t => `- ${t.tenderNumber}: ${t.title} (${t.status}, ${t.department || 'No dept'})`).join('\n')}

Please provide:
1. Market Trends: Brief analysis of patterns you see
2. Recommendations: 3 actionable suggestions to improve win rate
3. Risk Alerts: Any concerns or deadlines to watch
4. Opportunity Score: 1-100 rating of current opportunities

Respond in JSON format:
{
  "marketTrends": "...",
  "recommendations": ["...", "...", "..."],
  "riskAlerts": ["...", "..."],
  "opportunityScore": 75
}`

        const aiResponse = await callAI({
          prompt,
          systemPrompt: 'You are a medical tender analysis expert. Provide concise, actionable insights.',
          maxTokens: 1000,
          taskType: 'complexAnalysis',
        })

        if (aiResponse.success && aiResponse.content) {
          try {
            // Clean and parse AI response
            const cleanedContent = aiResponse.content
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim()

            const aiAnalysis = JSON.parse(cleanedContent)
            insights.aiAnalysis = aiAnalysis
          } catch (parseError) {
            logger.warn('Failed to parse AI analysis response', { error: parseError })
          }
        }
      } catch (aiError) {
        logger.warn('AI analysis failed', { error: aiError })
        // Continue without AI analysis
      }
    }

    return NextResponse.json({
      success: true,
      insights,
    })
  } catch (error) {
    logger.error('Tender analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tender analytics' },
      { status: 500 }
    )
  }
}
