/**
 * Customer Detail API Routes
 * Get, update, and delete individual customers
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/customers/[id] - Get customer details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tenders: true,
            invoices: true,
          },
        },
        tenders: {
          where: { isDeleted: false },
          select: {
            id: true,
            tenderNumber: true,
            title: true,
            status: true,
            estimatedValue: true,
            currency: true,
            submissionDeadline: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        invoices: {
          where: { isDeleted: false },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            currency: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (customer.isDeleted) {
      return NextResponse.json(
        { error: 'Customer has been deleted' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - Update customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const {
      name,
      type,
      registrationNumber,
      taxId,
      address,
      city,
      country,
      primaryContact,
      email,
      phone,
      paymentTerms,
      creditLimit,
      currentBalance,
      departments,
      isActive,
    } = body

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (existing.isDeleted) {
      return NextResponse.json(
        { error: 'Cannot update deleted customer' },
        { status: 410 }
      )
    }

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(registrationNumber !== undefined && { registrationNumber }),
        ...(taxId !== undefined && { taxId }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(primaryContact !== undefined && { primaryContact }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(creditLimit !== undefined && { creditLimit }),
        ...(currentBalance !== undefined && { currentBalance }),
        ...(departments !== undefined && { departments }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    console.log(`[Customer] Updated customer: ${customer.id} (${customer.name})`)

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Soft delete customer
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tenders: true,
            invoices: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (existing.isDeleted) {
      return NextResponse.json(
        { error: 'Customer already deleted' },
        { status: 410 }
      )
    }

    // Soft delete
    await prisma.customer.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
      },
    })

    console.log(`[Customer] Deleted customer: ${id} (${existing.name})`)

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
