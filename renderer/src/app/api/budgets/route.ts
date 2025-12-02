/**
 * Budget API Routes
 * GET /api/budgets - List all budgets
 * POST /api/budgets - Create a new budget
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// Validation schema for creating a budget
const createBudgetSchema = z.object({
  name: z.string().min(3),
  fiscalYear: z.number().min(2020).max(2030),
  type: z.enum(['MASTER', 'DEPARTMENT', 'PROJECT', 'TENDER']),
  department: z.string().optional(),
  totalAmount: z.number().min(0),
  startDate: z.string(),
  endDate: z.string(),
  currency: z.string().default('KWD'),
  notes: z.string().optional(),
  categories: z.array(z.object({
    name: z.string(),
    code: z.string(),
    type: z.enum(['REVENUE', 'EXPENSE', 'CAPITAL']),
    allocatedAmount: z.number().min(0),
    varianceThreshold: z.number().min(0).max(100).optional(),
    requiresApprovalOver: z.number().optional(),
    notes: z.string().optional(),
  })).optional(),
})

/**
 * GET /api/budgets - List all budgets with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const fiscalYear = searchParams.get('fiscalYear')
    const department = searchParams.get('department')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // Build where clause
    const where: Record<string, unknown> = {
      isDeleted: false,
    }

    if (status && status !== 'ALL') {
      where.status = status
    }
    if (type && type !== 'ALL') {
      where.type = type
    }
    if (fiscalYear && fiscalYear !== 'ALL') {
      where.fiscalYear = parseInt(fiscalYear)
    }
    if (department && department !== 'ALL') {
      where.department = department
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const total = await prisma.budget.count({ where })

    // Get budgets with pagination
    const budgets = await prisma.budget.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        approvedBy: {
          select: { id: true, fullName: true, email: true },
        },
        categories: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            allocatedAmount: true,
            spentAmount: true,
            committedAmount: true,
          },
          where: { isDeleted: false },
        },
        _count: {
          select: { categories: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Calculate spent amounts for each budget
    const budgetsWithSpent = budgets.map((budget) => {
      const totalSpent = budget.categories.reduce(
        (sum, cat) => sum + Number(cat.spentAmount),
        0
      )
      const totalCommitted = budget.categories.reduce(
        (sum, cat) => sum + Number(cat.committedAmount),
        0
      )

      return {
        ...budget,
        totalAmount: Number(budget.totalAmount),
        spentAmount: totalSpent,
        committedAmount: totalCommitted,
        availableAmount: Number(budget.totalAmount) - totalSpent - totalCommitted,
      }
    })

    return NextResponse.json({
      success: true,
      data: budgetsWithSpent,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/budgets - Create a new budget
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createBudgetSchema.parse(body)

    // Create budget with categories in a transaction
    const budget = await prisma.$transaction(async (tx) => {
      // Create the budget
      const newBudget = await tx.budget.create({
        data: {
          name: validatedData.name,
          fiscalYear: validatedData.fiscalYear,
          type: validatedData.type,
          department: validatedData.department,
          totalAmount: validatedData.totalAmount,
          startDate: new Date(validatedData.startDate),
          endDate: new Date(validatedData.endDate),
          currency: validatedData.currency,
          notes: validatedData.notes,
          status: 'DRAFT',
          createdById: session.user.id,
        },
      })

      // Create categories if provided
      if (validatedData.categories && validatedData.categories.length > 0) {
        await tx.budgetCategory.createMany({
          data: validatedData.categories.map((cat) => ({
            budgetId: newBudget.id,
            name: cat.name,
            code: cat.code,
            type: cat.type,
            allocatedAmount: cat.allocatedAmount,
            varianceThreshold: cat.varianceThreshold || 10,
            requiresApprovalOver: cat.requiresApprovalOver,
            notes: cat.notes,
          })),
        })
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          entityType: 'BUDGET',
          entityId: newBudget.id,
          newValues: validatedData,
        },
      })

      return newBudget
    })

    // Fetch the created budget with relations
    const createdBudget = await prisma.budget.findUnique({
      where: { id: budget.id },
      include: {
        categories: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: createdBudget,
      message: 'Budget created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create budget' },
      { status: 500 }
    )
  }
}
