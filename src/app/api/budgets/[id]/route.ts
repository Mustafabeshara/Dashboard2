/**
 * Budget Detail API
 * GET /api/budgets/[id] - Get a single budget by ID
 * PUT /api/budgets/[id] - Update a budget
 * DELETE /api/budgets/[id] - Soft delete a budget
 */

import { authOptions } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { cache, CacheKeys } from '@/lib/cache';
import prisma from '@/lib/prisma';
import { BudgetStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<BudgetStatus, BudgetStatus[]> = {
  DRAFT: ['PENDING', 'DRAFT'],
  PENDING: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['CLOSED'],
  CLOSED: [],
  REJECTED: ['DRAFT'],
};

// Roles that can approve/reject budgets
const APPROVAL_ROLES = ['ADMIN', 'CEO', 'CFO', 'FINANCE_MANAGER'];

// Roles that can delete budgets
const DELETE_ROLES = ['ADMIN', 'CEO', 'CFO'];

function canTransitionStatus(
  currentStatus: BudgetStatus,
  newStatus: BudgetStatus
): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

function isApprovalAction(newStatus: BudgetStatus): boolean {
  return newStatus === 'APPROVED' || newStatus === 'REJECTED';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Try cache first
    const cacheKey = `budget:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const budget = await prisma.budget.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        approvedBy: {
          select: { id: true, fullName: true, email: true },
        },
        categories: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            allocatedAmount: true,
            spentAmount: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            categories: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Calculate totals
    const totalAllocated = budget.categories.reduce(
      (sum, cat) => sum + Number(cat.allocatedAmount || 0),
      0
    );
    const totalSpent = budget.categories.reduce(
      (sum, cat) => sum + Number(cat.spentAmount || 0),
      0
    );

    const response = {
      ...budget,
      totalAllocated,
      totalSpent,
      remainingAmount: Number(budget.totalAmount) - totalSpent,
      utilizationPercent:
        Number(budget.totalAmount) > 0
          ? (totalSpent / Number(budget.totalAmount)) * 100
          : 0,
    };

    // Cache the result
    await cache.set(cacheKey, response, 300); // 5 minutes

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      type,
      status,
      totalAmount,
      startDate,
      endDate,
      departmentId,
      department,
      notes,
      fiscalYear,
      currency,
    } = body;

    // Check if budget exists
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Validate status transition if status is being changed
    if (status && status !== existingBudget.status) {
      if (!canTransitionStatus(existingBudget.status, status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${existingBudget.status} to ${status}`,
            allowedTransitions: VALID_STATUS_TRANSITIONS[existingBudget.status],
          },
          { status: 400 }
        );
      }

      // Check if user has permission to approve/reject
      if (isApprovalAction(status)) {
        if (!APPROVAL_ROLES.includes(session.user.role)) {
          return NextResponse.json(
            {
              error: 'You do not have permission to approve or reject budgets',
              requiredRoles: APPROVAL_ROLES,
            },
            { status: 403 }
          );
        }
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (department !== undefined) updateData.department = department;
    if (notes !== undefined) updateData.notes = notes;
    if (fiscalYear !== undefined) updateData.fiscalYear = fiscalYear;
    if (currency !== undefined) updateData.currency = currency;

    // Handle status changes with approval tracking
    if (status !== undefined) {
      updateData.status = status;

      // Track approval/rejection
      if (status === 'APPROVED' || status === 'REJECTED') {
        updateData.approvedById = session.user.id;
        updateData.approvedDate = new Date();
      }

      // Clear approval data if going back to draft
      if (status === 'DRAFT') {
        updateData.approvedById = null;
        updateData.approvedDate = null;
      }
    }

    // Update budget
    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        approvedBy: {
          select: { id: true, fullName: true, email: true },
        },
        categories: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            allocatedAmount: true,
            spentAmount: true,
          },
        },
      },
    });

    // Clear cache
    await cache.delete(`budget:${id}`);
    await cache.clear('budgets:');

    // Audit trail
    await audit.logUpdate(
      'Budget',
      id,
      existingBudget,
      budget,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: budget,
      message:
        status !== existingBudget.status
          ? `Budget ${status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'updated'} successfully`
          : 'Budget updated successfully',
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only specific roles can delete budgets
    if (!DELETE_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        {
          error: 'You do not have permission to delete budgets',
          requiredRoles: DELETE_ROLES,
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if budget exists
    const budget = await prisma.budget.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Prevent deletion of active budgets
    if (budget.status === 'ACTIVE') {
      return NextResponse.json(
        {
          error: 'Cannot delete an active budget. Please close it first.',
        },
        { status: 400 }
      );
    }

    // Soft delete the budget and its categories
    await prisma.$transaction([
      prisma.budget.update({
        where: { id },
        data: { isDeleted: true },
      }),
      prisma.budgetCategory.updateMany({
        where: { budgetId: id },
        data: { isDeleted: true },
      }),
    ]);

    // Clear cache
    await cache.delete(`budget:${id}`);
    await cache.clear('budgets:');

    // Audit trail
    await audit.logDelete('Budget', id, budget, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
