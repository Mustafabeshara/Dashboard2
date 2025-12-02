/**
 * Tender Status Update API
 * Handles tender status transitions
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TenderStatus } from '@prisma/client'

// PATCH /api/tenders/[id]/status - Update tender status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses: TenderStatus[] = [
      'DRAFT',
      'IN_PROGRESS',
      'SUBMITTED',
      'WON',
      'LOST',
      'CANCELLED',
    ]

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

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

    // Update status
    const tender = await prisma.tender.update({
      where: { id },
      data: {
        status,
        ...(notes && { notes: existing.notes ? `${existing.notes}\n\n${notes}` : notes }),
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

    console.log(
      `[Tender] Status updated: ${tender.id} (${tender.tenderNumber}) - ${existing.status} → ${status}`
    )

    return NextResponse.json({
      success: true,
      data: tender,
      message: `Tender status updated to ${status}`,
    })
  } catch (error) {
    console.error('Error updating tender status:', error)
    return NextResponse.json(
      { error: 'Failed to update tender status' },
      { status: 500 }
    )
  }
}
