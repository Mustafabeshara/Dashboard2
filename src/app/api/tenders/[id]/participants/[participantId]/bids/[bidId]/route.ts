/**
 * Single Bid API
 * Manages individual bid updates and deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateBidSchema = z.object({
  manufacturer: z.string().optional(),
  unitPrice: z.number().positive().optional(),
  totalPrice: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  deliveryTime: z.number().int().positive().optional(),
  deliveryUnit: z.enum(['days', 'weeks', 'months']).optional(),
  notes: z.string().max(500).optional(),
  isWinner: z.boolean().optional(),
});

// GET /api/tenders/[id]/participants/[participantId]/bids/[bidId] - Get single bid
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string; bidId: string }> }
) {
  const { id, participantId, bidId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bid = await prisma.participantItemBid.findUnique({
      where: {
        id: bidId,
        participantId,
        participant: { tenderId: id, isDeleted: false },
      },
      include: {
        tenderItem: {
          select: {
            id: true,
            itemNumber: true,
            description: true,
            quantity: true,
            unit: true,
          },
        },
      },
    });

    if (!bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: bid,
    });
  } catch (error) {
    console.error('Error fetching bid:', error);
    return NextResponse.json({ error: 'Failed to fetch bid' }, { status: 500 });
  }
}

// PATCH /api/tenders/[id]/participants/[participantId]/bids/[bidId] - Update bid
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string; bidId: string }> }
) {
  const { id, participantId, bidId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateBidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if bid exists
    const existing = await prisma.participantItemBid.findUnique({
      where: {
        id: bidId,
        participantId,
        participant: { tenderId: id, isDeleted: false },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    const bid = await prisma.participantItemBid.update({
      where: { id: bidId },
      data: validation.data,
      include: {
        tenderItem: {
          select: {
            id: true,
            itemNumber: true,
            description: true,
            quantity: true,
            unit: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: bid,
    });
  } catch (error) {
    console.error('Error updating bid:', error);
    return NextResponse.json({ error: 'Failed to update bid' }, { status: 500 });
  }
}

// DELETE /api/tenders/[id]/participants/[participantId]/bids/[bidId] - Delete bid
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string; bidId: string }> }
) {
  const { id, participantId, bidId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if bid exists
    const existing = await prisma.participantItemBid.findUnique({
      where: {
        id: bidId,
        participantId,
        participant: { tenderId: id, isDeleted: false },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    await prisma.participantItemBid.delete({
      where: { id: bidId },
    });

    return NextResponse.json({
      success: true,
      message: 'Bid deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting bid:', error);
    return NextResponse.json({ error: 'Failed to delete bid' }, { status: 500 });
  }
}
