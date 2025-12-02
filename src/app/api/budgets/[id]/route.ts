/**
 * Budget Detail API
 * GET /api/budgets/[id] - Get a single budget by ID
 * PUT /api/budgets/[id] - Update a budget
 * DELETE /api/budgets/[id] - Delete a budget
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

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        categories: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            allocatedAmount: true,
            spentAmount: true,
          }
        },
        _count: {
          select: {
            transactions: true,
            approvals: true,
          }
        }
      }
    })

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error fetching budget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const {
      name,
      description,
      type,
      status,
      totalAmount,
      startDate,
      endDate,
      departmentId,
    } = body

    // Check if budget exists
    const existingBudget = await prisma.budget.findUnique({
      where: { id }
    })

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Update budget
    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(status && { status }),
        ...(totalAmount !== undefined && { 
          totalAmount,
          availableAmount: totalAmount - existingBudget.spentAmount
        }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(departmentId && { departmentId }),
      },
      include: {
        department: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete budgets
    if (!['ADMIN', 'CEO', 'CFO'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if budget exists
    const budget = await prisma.budget.findUnique({
      where: { id }
    })

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Soft delete by setting isDeleted flag (if it exists) or hard delete
    await prisma.budget.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Budget deleted' })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
