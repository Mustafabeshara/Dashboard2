import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Assumed path for NextAuth configuration
import { prisma } from "@/lib/prisma"; // Assumed path for Prisma Client
import { ApiError, ApiResponse } from "@/lib/api"; // Assumed API response utilities
import { Expense } from "@prisma/client"; // Prisma type

// --- Zod Schemas (Assumed) ---
// In a real project, these would be in a separate file, e.g., "@/schemas/expense.schema"
import { z } from "zod";

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  description: z.string().max(500).optional(),
  expenseDate: z.string().datetime(), // ISO 8601 date string
  categoryId: z.string().uuid().optional(),
});

// --- Utility Functions (Assumed) ---
// In a real project, these would be in a separate file, e.g., "@/lib/utils"
const parseQueryParams = (request: NextRequest) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  return { page, limit, search, categoryId, startDate, endDate };
};

// --- API Route Handlers ---

/**
 * @route GET /api/expenses
 * @description List all expenses with pagination, search, and filtering.
 * @access Private (Authenticated)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiError("Unauthorized", 401);
    }

    const { page, limit, search, categoryId, startDate, endDate } = parseQueryParams(request);
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    // Search filter
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Date range filter
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.expenseDate.lte = new Date(endDate);
      }
    }

    const [expenses, totalCount] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: "desc" },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          budgetCategory: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return ApiResponse({
      data: expenses,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    }, 200);
  } catch (error) {
    console.error("[EXPENSES_GET]", error);
    return ApiError("Failed to fetch expenses", 500);
  }
}

/**
 * @route POST /api/expenses
 * @description Create a new expense.
 * @access Private (Authenticated)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiError("Unauthorized", 401);
    }

    const body = await request.json();
    const validatedData = createExpenseSchema.parse(body);

    // Generate expense number
    const expenseCount = await prisma.expense.count();
    const expenseNumber = `EXP-${String(expenseCount + 1).padStart(6, '0')}`;

    const newExpense = await prisma.expense.create({
      data: {
        expenseNumber,
        description: validatedData.description || 'Expense',
        amount: validatedData.amount,
        currency: validatedData.currency,
        category: 'General',
        expenseDate: new Date(validatedData.expenseDate),
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        budgetCategory: { select: { id: true, name: true } },
      },
    });

    return ApiResponse(newExpense, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiError("Invalid request data", 400, error.errors);
    }
    console.error("[EXPENSES_POST]", error);
    return ApiError("Failed to create expense", 500);
  }
}

// Optional: Add a handler for unsupported methods
export async function HEAD() { return ApiError("Method Not Allowed", 405); }
export async function PUT() { return ApiError("Method Not Allowed", 405); }
export async function DELETE() { return ApiError("Method Not Allowed", 405); }
