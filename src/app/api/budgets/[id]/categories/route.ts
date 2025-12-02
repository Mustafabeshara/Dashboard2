/**
 * Budget Categories API
 * GET /api/budgets/[id]/categories - Get categories for a budget
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

    // Check if budget exists
    const budget = await prisma.budget.findUnique({
      where: { id }
    })

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Fetch categories
    const categories = await prisma.budgetCategory.findMany({
      where: { 
        budgetId: id,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        allocatedAmount: true,
        spentAmount: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching budget categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
