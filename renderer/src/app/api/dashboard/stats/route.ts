/**
 * Dashboard Stats API Route
 * GET /api/dashboard/stats - Get dashboard statistics
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current fiscal year
    const currentYear = new Date().getFullYear()

    // Get active budgets count
    const activeBudgets = await prisma.budget.count({
      where: {
        status: 'ACTIVE',
        fiscalYear: currentYear,
        isDeleted: false,
      },
    })

    // Get pending approvals count
    const pendingApprovals = await prisma.budgetTransaction.count({
      where: {
        status: 'PENDING',
      },
    })

    // Get active alerts count
    const alertsCount = await prisma.budgetAlert.count({
      where: {
        isAcknowledged: false,
      },
    })

    // Get budget totals for current year
    const budgetAggregates = await prisma.budgetCategory.aggregate({
      where: {
        budget: {
          fiscalYear: currentYear,
          status: 'ACTIVE',
          isDeleted: false,
        },
        isDeleted: false,
      },
      _sum: {
        allocatedAmount: true,
        spentAmount: true,
        committedAmount: true,
      },
    })

    const totalBudget = Number(budgetAggregates._sum.allocatedAmount || 0)
    const totalSpent = Number(budgetAggregates._sum.spentAmount || 0)
    const totalCommitted = Number(budgetAggregates._sum.committedAmount || 0)
    const availableBudget = totalBudget - totalSpent - totalCommitted
    const consumptionPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

    // Get department-wise breakdown
    const departmentBudgets = await prisma.budget.findMany({
      where: {
        fiscalYear: currentYear,
        status: 'ACTIVE',
        type: 'DEPARTMENT',
        isDeleted: false,
      },
      include: {
        categories: {
          where: { isDeleted: false },
          select: {
            allocatedAmount: true,
            spentAmount: true,
          },
        },
      },
    })

    const departmentData = departmentBudgets.map((budget) => {
      const allocated = budget.categories.reduce(
        (sum, cat) => sum + Number(cat.allocatedAmount),
        0
      )
      const spent = budget.categories.reduce(
        (sum, cat) => sum + Number(cat.spentAmount),
        0
      )

      return {
        department: budget.department || 'Unassigned',
        allocated,
        spent,
        available: allocated - spent,
        percentage: allocated > 0 ? (spent / allocated) * 100 : 0,
      }
    })

    // Get recent transactions
    const recentTransactions = await prisma.budgetTransaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        budgetCategory: {
          select: { name: true, code: true },
        },
        createdBy: {
          select: { fullName: true },
        },
      },
    })

    // Get upcoming tender deadlines
    const upcomingTenders = await prisma.tender.findMany({
      where: {
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
        submissionDeadline: { gte: new Date() },
        isDeleted: false,
      },
      orderBy: { submissionDeadline: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        submissionDeadline: true,
        estimatedValue: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalBudget,
          totalSpent,
          totalCommitted,
          availableBudget,
          consumptionPercentage: Math.round(consumptionPercentage * 100) / 100,
          activeBudgets,
          pendingApprovals,
          alertsCount,
        },
        departmentBudgets: departmentData,
        recentTransactions: recentTransactions.map((t) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          status: t.status,
          category: t.budgetCategory?.name,
          createdBy: t.createdBy?.fullName,
          date: t.transactionDate,
        })),
        upcomingTenders: upcomingTenders.map((t) => ({
          id: t.id,
          title: t.title,
          deadline: t.submissionDeadline,
          value: Number(t.estimatedValue),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
