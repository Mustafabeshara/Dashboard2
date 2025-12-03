/**
 * Tender Items API
 * Manages individual tender line items
 */

import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createItemSchema = z.object({
  itemNumber: z.number().int().positive(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unit: z.string().min(1),
  specifications: z.string().optional(),
  isParticipating: z.boolean().default(true),
  estimatedPrice: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

// GET /api/tenders/[id]/items - List all items for a tender
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.tenderItem.findMany({
      where: {
        tenderId: id,
        isDeleted: false,
      },
      orderBy: {
        itemNumber: 'asc',
      },
      include: {
        participantBids: {
          where: { participant: { isDeleted: false } },
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                companyName: true,
                isOurBid: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('Error fetching tender items:', error);
    return NextResponse.json({ error: 'Failed to fetch tender items' }, { status: 500 });
  }
}

// POST /api/tenders/[id]/items - Create new tender item
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if tender exists
    const tender = await prisma.tender.findUnique({
      where: { id, isDeleted: false },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Check for duplicate item number
    const existing = await prisma.tenderItem.findUnique({
      where: {
        tenderId_itemNumber: {
          tenderId: id,
          itemNumber: validation.data.itemNumber,
        },
        isDeleted: false,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Item number already exists' }, { status: 409 });
    }

    const item = await prisma.tenderItem.create({
      data: {
        tenderId: id,
        ...validation.data,
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error creating tender item:', error);
    return NextResponse.json({ error: 'Failed to create tender item' }, { status: 500 });
  }
}
