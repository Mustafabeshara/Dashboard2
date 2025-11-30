/**
 * Tender Statistics API
 * Provides aggregated tender data for dashboards
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/tenders/stats - Get tender statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    // Build where clause
    const where: Prisma.TenderWhereInput = {
      isDeleted: false,
    }

    if (customerId) {
      where.customerId = customerId
    }

    // Get counts by status
    const [
      totalCount,
      draftCount,
      inProgressCount,
      submittedCount,
      wonCount,
      lostCount,
      cancelledCount,
    ] = await Promise.all([
      prisma.tender.count({ where }),
      prisma.tender.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.tender.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.tender.count({ where: { ...where, status: 'SUBMITTED' } }),
      prisma.tender.count({ where: { ...where, status: 'WON' } }),
      prisma.tender.count({ where: { ...where, status: 'LOST' } }),
      prisma.tender.count({ where: { ...where, status: 'CANCELLED' } }),
    ])

    // Get upcoming deadlines (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const upcomingDeadlines = await prisma.tender.findMany({
      where: {
        ...where,
        submissionDeadline: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
        status: {
          in: ['DRAFT', 'IN_PROGRESS'],
        },
      },
      select: {
        id: true,
        tenderNumber: true,
        title: true,
        submissionDeadline: true,
        status: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        submissionDeadline: 'asc',
      },
      take: 10,
    })

    // Get overdue tenders
    const overdueTenders = await prisma.tender.findMany({
      where: {
        ...where,
        submissionDeadline: {
          lt: new Date(),
        },
        status: {
          in: ['DRAFT', 'IN_PROGRESS'],
        },
      },
      select: {
        id: true,
        tenderNumber: true,
        title: true,
        submissionDeadline: true,
        status: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        submissionDeadline: 'desc',
      },
      take: 10,
    })

    // Calculate win rate
    const decidedCount = wonCount + lostCount
    const winRate = decidedCount > 0 ? (wonCount / decidedCount) * 100 : 0

    // Get total estimated value
    const valueAggregation = await prisma.tender.aggregate({
      where,
      _sum: {
        estimatedValue: true,
      },
    })

    const totalEstimatedValue = valueAggregation._sum.estimatedValue || 0

    // Get won value
    const wonValueAggregation = await prisma.tender.aggregate({
      where: { ...where, status: 'WON' },
      _sum: {
        estimatedValue: true,
      },
    })

    const wonValue = wonValueAggregation._sum.estimatedValue || 0

    // Get recent activity (last 10 tenders)
    const recentTenders = await prisma.tender.findMany({
      where,
      select: {
        id: true,
        tenderNumber: true,
        title: true,
        status: true,
        submissionDeadline: true,
        estimatedValue: true,
        currency: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          total: totalCount,
          draft: draftCount,
          inProgress: inProgressCount,
          submitted: submittedCount,
          won: wonCount,
          lost: lostCount,
          cancelled: cancelledCount,
        },
        metrics: {
          winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
          totalEstimatedValue: Number(totalEstimatedValue),
          wonValue: Number(wonValue),
          activeCount: draftCount + inProgressCount + submittedCount,
          overdueCount: overdueTenders.length,
        },
        upcomingDeadlines,
        overdueTenders,
        recentTenders,
      },
    })
  } catch (error) {
    console.error('Error fetching tender statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tender statistics' },
      { status: 500 }
    )
  }
}
