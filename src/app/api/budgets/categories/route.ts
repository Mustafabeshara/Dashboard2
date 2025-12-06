/**
 * Budget Categories API
 * Returns all budget categories for dropdown/selection purposes
 */

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/budgets/categories
 * List all budget categories (non-deleted)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');
    const includeAmounts = searchParams.get('includeAmounts') === 'true';

    // Build where clause
    const where: any = {
      isDeleted: false,
    };

    if (budgetId) {
      where.budgetId = budgetId;
    }

    // Fetch categories with hierarchy
    const categories = await prisma.budgetCategory.findMany({
      where,
      include: includeAmounts
        ? {
            _count: {
              select: {
                transactions: true,
              },
            },
          }
        : undefined,
      orderBy: [{ name: 'asc' }],
    });

    // Build hierarchy structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map of all categories
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        ...cat,
        children: [],
        totalAllocated: Number(cat.allocatedAmount || 0),
        totalSpent: Number(cat.spentAmount || 0),
        totalAvailable: Number(cat.allocatedAmount || 0) - Number(cat.spentAmount || 0),
      });
    });

    // Second pass: build hierarchy
    categories.forEach(cat => {
      const categoryNode = categoryMap.get(cat.id);
      if (cat.parentCategoryId) {
        const parent = categoryMap.get(cat.parentCategoryId);
        if (parent) {
          parent.children.push(categoryNode);
        }
      } else {
        rootCategories.push(categoryNode);
      }
    });

    // Calculate totals including children
    const calculateTotals = (category: any): any => {
      let totalAllocated = Number(category.allocatedAmount || 0);
      let totalSpent = Number(category.spentAmount || 0);
      let totalAvailable = Number(category.availableAmount || 0);

      category.children.forEach((child: any) => {
        const childTotals = calculateTotals(child);
        totalAllocated += childTotals.totalAllocated;
        totalSpent += childTotals.totalSpent;
        totalAvailable += childTotals.totalAvailable;
      });

      return {
        ...category,
        totalAllocated,
        totalSpent,
        totalAvailable,
        utilizationPercentage:
          totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
      };
    };

    const categoriesWithTotals = rootCategories.map(calculateTotals);

    // Calculate summary stats
    const summary = {
      totalCategories: categories.length,
      rootCategories: rootCategories.length,
      totalAllocated: categoriesWithTotals.reduce((sum, cat) => sum + cat.totalAllocated, 0),
      totalSpent: categoriesWithTotals.reduce((sum, cat) => sum + cat.totalSpent, 0),
      totalAvailable: categoriesWithTotals.reduce((sum, cat) => sum + cat.totalAvailable, 0),
    };

    return NextResponse.json({
      categories: categoriesWithTotals,
      flat: categories, // Also return flat list for dropdowns
      summary,
    });
  } catch (error) {
    console.error('Budget categories fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch budget categories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budgets/categories
 * Create a new budget category
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { budgetId, code, name, description, parentId, allocatedAmount, requiresApprovalOver } =
      body;

    // Validate required fields
    if (!budgetId || !code || !name || allocatedAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: budgetId, code, name, allocatedAmount' },
        { status: 400 }
      );
    }

    // Check if budget exists
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId, isDeleted: false },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Determine level based on parent
    let level = 1;
    if (parentId) {
      const parent = await prisma.budgetCategory.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
      }
      // Calculate level based on parent hierarchy
      const calculateLevel = (cat: any): number => {
        if (!cat.parentCategoryId) return 1;
        return 2; // Simplified - in production, recursively calculate
      };
      level = calculateLevel(parent) + 1;
      if (level > 4) {
        return NextResponse.json(
          { error: 'Maximum category depth (4 levels) exceeded' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate code within same budget
    const existingCategory = await prisma.budgetCategory.findFirst({
      where: {
        budgetId,
        code,
        isDeleted: false,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: `Category with code '${code}' already exists in this budget` },
        { status: 409 }
      );
    }

    // Create category
    const category = await prisma.budgetCategory.create({
      data: {
        budgetId,
        code,
        name,
        notes: description,
        parentCategoryId: parentId,
        type: 'EXPENSE',
        allocatedAmount,
        spentAmount: 0,
        requiresApprovalOver: requiresApprovalOver || 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Budget category creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create budget category',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
