/**
 * Expenses API Routes
 * GET /api/expenses - List all expenses
 * POST /api/expenses - Create a new expense
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiError, ApiResponse, ApiPaginated } from '@/lib/api';
import { audit } from '@/lib/audit';
import { cache } from '@/lib/cache';
import { requirePermission } from '@/lib/rbac';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { z } from 'zod';

const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('KWD'),
  description: z.string().max(500).optional(),
  expenseDate: z.string().datetime(),
  categoryId: z.string().uuid().optional(),
  category: z.string().optional(),
  budgetCategoryId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

/**
 * @route GET /api/expenses
 * @description List all expenses with pagination, search, and filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiError('Unauthorized', 401);
    }

    // Permission check
    requirePermission(session, 'expenses', 'view');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.standard)(request);
    if (rateLimitResult) return rateLimitResult;

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const budgetCategoryId = searchParams.get('budgetCategoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Try cache first
    const cacheKey = `expenses:list:${page}:${limit}:${search}:${categoryId}:${budgetCategoryId}:${startDate}:${endDate}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return ApiResponse(cached, 200);
    }

    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    // Search filter
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { expenseNumber: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter (string category)
    if (categoryId) {
      where.category = categoryId;
    }

    // Budget category filter
    if (budgetCategoryId) {
      where.budgetCategoryId = budgetCategoryId;
    }

    // Date range filter
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        (where.expenseDate as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.expenseDate as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [expenses, totalCount] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          createdBy: { select: { id: true, fullName: true, email: true } },
          budgetCategory: { select: { id: true, name: true, code: true } },
          vendor: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    const response = {
      data: expenses,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    // Cache the result
    await cache.set(cacheKey, response, 300); // 5 minutes

    return ApiPaginated(expenses, page, limit, totalCount);
  } catch (error) {
    console.error('[EXPENSES_GET]', error);
    return ApiError('Failed to fetch expenses', 500);
  }
}

/**
 * @route POST /api/expenses
 * @description Create a new expense.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiError('Unauthorized', 401);
    }

    // Permission check
    requirePermission(session, 'expenses', 'create');

    // Rate limiting (stricter for mutations)
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const parseResult = createExpenseSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiError('Invalid request data', 400, parseResult.error.errors);
    }

    const validatedData = parseResult.data;

    // Generate expense number
    const currentYear = new Date().getFullYear();
    const expenseCount = await prisma.expense.count({
      where: {
        expenseNumber: {
          startsWith: `EXP-${currentYear}`,
        },
      },
    });
    const expenseNumber = `EXP-${currentYear}-${String(expenseCount + 1).padStart(5, '0')}`;

    const newExpense = await prisma.expense.create({
      data: {
        expenseNumber,
        description: validatedData.description || 'Expense',
        amount: validatedData.amount,
        currency: validatedData.currency,
        category: validatedData.category || 'General',
        expenseDate: new Date(validatedData.expenseDate),
        budgetCategoryId: validatedData.budgetCategoryId,
        vendorId: validatedData.vendorId,
        notes: validatedData.notes,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        budgetCategory: { select: { id: true, name: true, code: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    // Clear cache
    await cache.clear('expenses:');

    // Audit trail
    await audit.logCreate('Expense', newExpense.id, newExpense, session.user.id);

    return ApiResponse(
      {
        success: true,
        data: newExpense,
        message: 'Expense created successfully',
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiError('Invalid request data', 400, error.errors);
    }
    console.error('[EXPENSES_POST]', error);
    return ApiError('Failed to create expense', 500);
  }
}
