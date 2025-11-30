/**
 * Tender Detail API Routes
 * Operations for individual tenders
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TenderStatus } from '@prisma/client'

// GET /api/tenders/[id] - Get tender by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const tender = await prisma.tender.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
            primaryContact: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    if (!tender) {
      return NextResponse.json(
        { error: 'Tender not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tender,
    })
  } catch (error) {
    console.error('Error fetching tender:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tender' },
      { status: 500 }
    )
  }
}

// PATCH /api/tenders/[id] - Update tender
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const {
      tenderNumber,
      title,
      description,
      customerId,
      department,
      category,
      submissionDeadline,
      openingDate,
      estimatedValue,
      currency,
      status,
      documents,
      products,
      technicalRequirements,
      commercialRequirements,
      bondRequired,
      bondAmount,
      notes,
    } = body

    // Check if tender exists
    const existing = await prisma.tender.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Tender not found' },
        { status: 404 }
      )
    }

    // If tender number is being changed, check for duplicates
    if (tenderNumber && tenderNumber !== existing.tenderNumber) {
      const duplicate = await prisma.tender.findUnique({
        where: { tenderNumber },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Tender number already exists' },
          { status: 409 }
        )
      }
    }

    // Update tender
    const tender = await prisma.tender.update({
      where: { id },
      data: {
        ...(tenderNumber && { tenderNumber }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(customerId !== undefined && { customerId }),
        ...(department !== undefined && { department }),
        ...(category !== undefined && { category }),
        ...(submissionDeadline !== undefined && {
          submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
        }),
        ...(openingDate !== undefined && {
          openingDate: openingDate ? new Date(openingDate) : null,
        }),
        ...(estimatedValue !== undefined && { estimatedValue }),
        ...(currency && { currency }),
        ...(status && { status }),
        ...(documents !== undefined && { documents }),
        ...(products !== undefined && { products }),
        ...(technicalRequirements !== undefined && { technicalRequirements }),
        ...(commercialRequirements !== undefined && { commercialRequirements }),
        ...(bondRequired !== undefined && { bondRequired }),
        ...(bondAmount !== undefined && { bondAmount }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    console.log(`[Tender] Updated tender: ${tender.id} (${tender.tenderNumber})`)

    return NextResponse.json({
      success: true,
      data: tender,
      message: 'Tender updated successfully',
    })
  } catch (error) {
    console.error('Error updating tender:', error)
    return NextResponse.json(
      { error: 'Failed to update tender' },
      { status: 500 }
    )
  }
}

// DELETE /api/tenders/[id] - Soft delete tender
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check if tender exists
    const existing = await prisma.tender.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Tender not found' },
        { status: 404 }
      )
    }

    // Soft delete
    await prisma.tender.update({
      where: { id },
      data: { isDeleted: true },
    })

    console.log(`[Tender] Deleted tender: ${id} (${existing.tenderNumber})`)

    return NextResponse.json({
      success: true,
      message: 'Tender deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting tender:', error)
    return NextResponse.json(
      { error: 'Failed to delete tender' },
      { status: 500 }
    )
  }
}
