/**
 * Supplier Detail API Routes
 * Get, update, and delete individual suppliers
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/suppliers/[id] - Get supplier details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    if (supplier.isDeleted) {
      return NextResponse.json(
        { error: 'Supplier has been deleted' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      success: true,
      data: supplier,
    })
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    )
  }
}

// PATCH /api/suppliers/[id] - Update supplier
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
      code,
      category,
      contactPerson,
      email,
      phone,
      address,
      city,
      country,
      website,
      taxId,
      registrationNumber,
      paymentTerms,
      leadTime,
      rating,
      notes,
      isActive,
    } = body

    // Check if supplier exists
    const existing = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    if (existing.isDeleted) {
      return NextResponse.json(
        { error: 'Cannot update deleted supplier' },
        { status: 410 }
      )
    }

    // Check for duplicate code
    if (code && code !== existing.code) {
      const duplicate = await prisma.supplier.findUnique({
        where: { code },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Supplier code already exists' },
          { status: 400 }
        )
      }
    }

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(category !== undefined && { category }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(website !== undefined && { website }),
        ...(taxId !== undefined && { taxId }),
        ...(registrationNumber !== undefined && { registrationNumber }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(leadTime !== undefined && { leadTime: leadTime ? parseInt(leadTime) : null }),
        ...(rating !== undefined && { rating: rating ? parseFloat(rating) : null }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    console.log(`[Supplier] Updated supplier: ${supplier.id} (${supplier.name})`)

    return NextResponse.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully',
    })
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Soft delete supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if supplier exists
    const existing = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    if (existing.isDeleted) {
      return NextResponse.json(
        { error: 'Supplier already deleted' },
        { status: 410 }
      )
    }

    // Soft delete
    await prisma.supplier.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
      },
    })

    console.log(`[Supplier] Deleted supplier: ${id} (${existing.name})`)

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}
