/**
 * Budget API Routes
 * GET /api/budgets - List all budgets
 * POST /api/budgets - Create a new budget
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/with-auth'
import { ApiResponse, ApiPaginated, BadRequest, InternalError } from '@/lib/api'
import { logger } from '@/lib/logger'
import { parsePagination, parseSort, parseSearch, buildSearchWhere, getPaginationMeta } from '@/lib/utils/pagination'
import { handleError } from '@/lib/errors/error-handler'
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit'

// Validation schema for creating a budget
const createBudgetSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  fiscalYear: z.number().min(2020).max(2030),
  type: z.enum(['MASTER', 'DEPARTMENT', 'PROJECT', 'TENDER']),
  department: z.string().optional(),
  totalAmount: z.number().min(0, 'Amount must be positive'),
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

// Budget search params schema
const budgetSearchSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED', 'ALL']).optional(),
  type: z.enum(['MASTER', 'DEPARTMENT', 'PROJECT', 'TENDER', 'ALL']).optional(),
  fiscalYear: z.coerce.number().optional(),
  department: z.string().optional(),
})

const rateLimiter = rateLimit(RateLimitPresets.standard)

/**
 * GET /api/budgets - List all budgets with optional filters
 */
async function handleGet(request: AuthenticatedRequest) {
  // Check rate limit
  const rateLimitResponse = await rateLimiter(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { pagination, sort } = {
      pagination: parsePagination(request),
      sort: parseSort(request, ['createdAt', 'name', 'totalAmount', 'startDate'], 'createdAt'),
    }
    const search = parseSearch(request)

    // Parse filters
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const filters = budgetSearchSchema.safeParse(params)

    // Build where clause
    const where: Record<string, unknown> = {
      isDeleted: false,
    }

    if (filters.success) {
      const { status, type, fiscalYear, department } = filters.data
      if (status && status !== 'ALL') where.status = status
      if (type && type !== 'ALL') where.type = type
      if (fiscalYear) where.fiscalYear = fiscalYear
      if (department && department !== 'ALL') where.department = department
    }

    // Add search
    const searchWhere = buildSearchWhere(search, ['name', 'department'])
    if (searchWhere) {
      where.OR = searchWhere.OR
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
      orderBy: { [sort.sortBy]: sort.sortOrder },
      skip: pagination.skip,
      take: pagination.limit,
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

    logger.info('Budgets fetched', {
      context: {
        userId: request.user.id,
        count: budgets.length,
        total,
      },
    })

    return ApiPaginated(budgetsWithSpent, pagination.page, pagination.limit, total)
  } catch (error) {
    logger.error('Error fetching budgets', error as Error, { userId: request.user.id })
    return handleError(error)
  }
}

/**
 * POST /api/budgets - Create a new budget
 */
async function handlePost(request: AuthenticatedRequest) {
  // Check rate limit
  const rateLimitResponse = await rateLimiter(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const parseResult = createBudgetSchema.safeParse(body)

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return BadRequest('Validation failed', errors)
    }

    const validatedData = parseResult.data

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
          createdById: request.user.id,
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
          userId: request.user.id,
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

    logger.info('Budget created', {
      context: {
        userId: request.user.id,
        budgetId: budget.id,
        name: validatedData.name,
      },
    })

    return ApiResponse(createdBudget, 201)
  } catch (error) {
    logger.error('Error creating budget', error as Error, { userId: request.user.id })
    return handleError(error)
  }
}

// Export with auth middleware
export const GET = withAuth(handleGet)
export const POST = withAuth(handlePost, { roleGroup: 'FINANCE' })
