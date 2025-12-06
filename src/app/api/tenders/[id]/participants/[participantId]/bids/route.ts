/**
 * Participant Item Bids API
 * Manages bidder pricing for specific tender items
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createBidSchema = z.object({
  tenderItemId: z.string().uuid(),
  manufacturer: z.string().optional(),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive(),
  currency: z.string().length(3).default('KWD'),
  deliveryTime: z.number().int().positive().optional(),
  deliveryUnit: z.enum(['days', 'weeks', 'months']).optional(),
  notes: z.string().max(500).optional(),
  isWinner: z.boolean().default(false),
});

// GET /api/tenders/[id]/participants/[participantId]/bids - List all bids by this participant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const { id, participantId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bids = await prisma.participantItemBid.findMany({
      where: {
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
            isParticipating: true,
          },
        },
      },
      orderBy: {
        tenderItem: { itemNumber: 'asc' },
      },
    });

    return NextResponse.json({
      success: true,
      data: bids,
    });
  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 });
  }
}

// POST /api/tenders/[id]/participants/[participantId]/bids - Create bid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const { id, participantId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createBidSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verify participant exists and belongs to this tender
    const participant = await prisma.tenderParticipant.findUnique({
      where: {
        id: participantId,
        tenderId: id,
        isDeleted: false,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Check if bid already exists for this item
    const existing = await prisma.participantItemBid.findUnique({
      where: {
        participantId_tenderItemId: {
          participantId,
          tenderItemId: validation.data.tenderItemId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bid already exists for this item. Use PATCH to update.' },
        { status: 409 }
      );
    }

    const bid = await prisma.participantItemBid.create({
      data: {
        participantId,
        ...validation.data,
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

    return NextResponse.json({
      success: true,
      data: bid,
    });
  } catch (error) {
    console.error('Error creating bid:', error);
    return NextResponse.json({ error: 'Failed to create bid' }, { status: 500 });
  }
}

// Note: PATCH and DELETE operations are in [bidId]/route.ts
