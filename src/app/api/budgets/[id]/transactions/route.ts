/**
 * Budget Transactions API
 * GET /api/budgets/[id]/transactions - Get transactions for a budget
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Check if budget exists
    const budget = await prisma.budget.findUnique({
      where: { id }
    })

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Fetch transactions
    const [transactions, total] = await Promise.all([
      prisma.budgetTransaction.findMany({
        where: { budgetId: id },
        include: {
          category: {
            select: { id: true, name: true }
          },
          createdBy: {
            select: { id: true, name: true }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.budgetTransaction.count({
        where: { budgetId: id }
      })
    ])

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('Error fetching budget transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
