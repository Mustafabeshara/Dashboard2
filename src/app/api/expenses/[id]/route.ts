/**
 * Expense Detail API Routes
 * GET /api/expenses/[id] - Get expense by ID
 * PATCH /api/expenses/[id] - Update expense
 * DELETE /api/expenses/[id] - Soft delete expense
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiError, ApiResponse } from '@/lib/api';
import { audit } from '@/lib/audit';
import { cache } from '@/lib/cache';
import { requirePermission } from '@/lib/rbac';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { z } from 'zod';

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  description: z.string().max(500).optional(),
  expenseDate: z.string().datetime().optional(),
  category: z.string().optional(),
  budgetCategoryId: z.string().uuid().nullable().optional(),
  vendorId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

// Roles that can approve expenses
const APPROVAL_ROLES = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER'];

/**
 * @route GET /api/expenses/[id]
 * @description Get a specific expense by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Try cache first
    const cacheKey = `expense:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return ApiResponse({ success: true, data: cached }, 200);
    }

    const expense = await prisma.expense.findFirst({
      where: { id, isDeleted: false },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        budgetCategory: {
          select: {
            id: true,
            name: true,
            code: true,
            budget: { select: { id: true, name: true } },
          },
        },
        vendor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!expense) {
      return ApiError('Expense not found', 404);
    }

    // Cache the result
    await cache.set(cacheKey, expense, 300); // 5 minutes

    return ApiResponse({ success: true, data: expense }, 200);
  } catch (error) {
    console.error('[EXPENSE_DETAIL_GET]', error);
    return ApiError('Failed to fetch expense', 500);
  }
}

/**
 * @route PATCH /api/expenses/[id]
 * @description Update a specific expense by ID.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiError('Unauthorized', 401);
    }

    // Permission check
    requirePermission(session, 'expenses', 'edit');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await params;

    // Check if expense exists
    const existingExpense = await prisma.expense.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingExpense) {
      return ApiError('Expense not found', 404);
    }

    // Validate request body
    const body = await request.json();
    const parseResult = updateExpenseSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiError('Invalid request data', 400, parseResult.error.errors);
    }

    const validatedData = parseResult.data;

    // Check approval permission
    if (
      validatedData.status &&
      (validatedData.status === 'APPROVED' || validatedData.status === 'REJECTED')
    ) {
      if (!APPROVAL_ROLES.includes(session.user.role)) {
        return ApiError('You do not have permission to approve or reject expenses', 403);
      }
    }

    // Prepare data for update
    const updateData: Record<string, unknown> = {};

    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
    if (validatedData.currency !== undefined) updateData.currency = validatedData.currency;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.expenseDate !== undefined)
      updateData.expenseDate = new Date(validatedData.expenseDate);
    if (validatedData.category !== undefined) updateData.category = validatedData.category;
    if (validatedData.budgetCategoryId !== undefined)
      updateData.budgetCategoryId = validatedData.budgetCategoryId;
    if (validatedData.vendorId !== undefined)
      updateData.vendorId = validatedData.vendorId;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    // Perform update
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        budgetCategory: { select: { id: true, name: true, code: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    // Clear cache
    await cache.delete(`expense:${id}`);
    await cache.clear('expenses:');

    // Audit trail
    await audit.logUpdate('Expense', id, existingExpense, updatedExpense, session.user.id);

    return ApiResponse(
      {
        success: true,
        data: updatedExpense,
        message: 'Expense updated successfully',
      },
      200
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiError('Invalid request data', 400, error.errors);
    }
    console.error('[EXPENSE_DETAIL_PATCH]', error);
    return ApiError('Failed to update expense', 500);
  }
}

/**
 * @route DELETE /api/expenses/[id]
 * @description Soft-delete a specific expense by ID.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiError('Unauthorized', 401);
    }

    // Permission check
    requirePermission(session, 'expenses', 'delete');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await params;

    // Check if expense exists
    const existingExpense = await prisma.expense.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingExpense) {
      return ApiError('Expense not found', 404);
    }

    // Prevent deletion of approved expenses
    if ((existingExpense as { status?: string }).status === 'APPROVED') {
      return ApiError('Cannot delete an approved expense', 400);
    }

    // Perform soft-delete
    await prisma.expense.update({
      where: { id },
      data: { isDeleted: true },
    });

    // Clear cache
    await cache.delete(`expense:${id}`);
    await cache.clear('expenses:');

    // Audit trail
    await audit.logDelete('Expense', id, existingExpense, session.user.id);

    return ApiResponse(
      {
        success: true,
        message: 'Expense deleted successfully',
      },
      200
    );
  } catch (error) {
    console.error('[EXPENSE_DETAIL_DELETE]', error);
    return ApiError('Failed to delete expense', 500);
  }
}
