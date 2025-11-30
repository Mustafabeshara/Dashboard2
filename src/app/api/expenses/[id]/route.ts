import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Assumed path for NextAuth configuration
import { prisma } from "@/lib/prisma"; // Assumed path for Prisma Client
import { ApiError, ApiResponse } from "@/lib/api"; // Assumed API response utilities
import { Expense } from "@prisma/client"; // Prisma type
import { z } from "zod";

// --- Zod Schemas (Assumed) ---
const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  description: z.string().max(500).optional(),
  expenseDate: z.string().datetime().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

// --- Utility Function to get Expense by ID ---
async function getExpenseById(id: string, userId: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      budgetCategory: { select: { id: true, name: true } },
    },
  });
}

// --- API Route Handlers ---

/**
 * @route GET /api/expenses/[id]
 * @description Get a specific expense by ID.
 * @access Private (Authenticated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiError("Unauthorized", 401);
    }

    const expense = await getExpenseById(params.id, session.user.id);

    if (!expense) {
      return ApiError("Expense not found", 404);
    }

    return ApiResponse(expense, 200);
  } catch (error) {
    console.error("[EXPENSE_DETAIL_GET]", error);
    return ApiError("Failed to fetch expense", 500);
  }
}

/**
 * @route PATCH /api/expenses/[id]
 * @description Update a specific expense by ID.
 * @access Private (Authenticated)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiError("Unauthorized", 401);
    }

    // 1. Check if expense exists and belongs to user
    const existingExpense = await getExpenseById(params.id, session.user.id);
    if (!existingExpense) {
      return ApiError("Expense not found or unauthorized access", 404);
    }

    // 2. Validate request body
    const body = await request.json();
    const validatedData = updateExpenseSchema.parse(body);

    // 3. Prepare data for update
    const updateData: any = { ...validatedData };
    if (validatedData.expenseDate) {
      updateData.expenseDate = new Date(validatedData.expenseDate);
    }

    // 4. Perform update
    const updatedExpense = await prisma.expense.update({
      where: { id: params.id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        budgetCategory: { select: { id: true, name: true } },
      },
    });

    return ApiResponse(updatedExpense, 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiError("Invalid request data", 400, error.errors);
    }
    console.error("[EXPENSE_DETAIL_PATCH]", error);
    return ApiError("Failed to update expense", 500);
  }
}

/**
 * @route DELETE /api/expenses/[id]
 * @description Soft-delete a specific expense by ID.
 * @access Private (Authenticated)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiError("Unauthorized", 401);
    }

    // 1. Check if expense exists and belongs to user
    const existingExpense = await getExpenseById(params.id, session.user.id);
    if (!existingExpense) {
      return ApiError("Expense not found or unauthorized access", 404);
    }

    // 2. Perform soft-delete
    await prisma.expense.update({
      where: { id: params.id },
      data: { isDeleted: true },
    });

    return ApiResponse({ message: "Expense soft-deleted successfully" }, 200);
  } catch (error) {
    console.error("[EXPENSE_DETAIL_DELETE]", error);
    return ApiError("Failed to soft-delete expense", 500);
  }
}

// Optional: Add a handler for unsupported methods
export async function POST() { return ApiError("Method Not Allowed", 405); }
export async function PUT() { return ApiError("Method Not Allowed", 405); }
export async function HEAD() { return ApiError("Method Not Allowed", 405); }
