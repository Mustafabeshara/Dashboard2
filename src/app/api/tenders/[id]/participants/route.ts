/**
 * Tender Participants API
 * Manages bidders/participants and validates against tender status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createParticipantSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  isOurBid: z.boolean().default(false),
});

// GET /api/tenders/[id]/participants - List all participants
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const participants = await prisma.tenderParticipant.findMany({
      where: {
        tenderId: id,
        isDeleted: false,
      },
      include: {
        itemBids: {
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
        },
      },
      orderBy: {
        addedAt: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }
}

// POST /api/tenders/[id]/participants - Add participant
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createParticipantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if tender exists and get its status
    const tender = await prisma.tender.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        status: true,
        submissionDeadline: true,
      },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Check if tender is closed - prevent adding participants after closing
    const now = new Date();
    const isClosed = tender.submissionDeadline && tender.submissionDeadline < now;

    if (isClosed || ['WON', 'LOST', 'CANCELLED'].includes(tender.status)) {
      return NextResponse.json(
        {
          error: 'Cannot add participants after tender is closed',
          details: `Tender status: ${tender.status}. Deadline passed: ${isClosed}`,
        },
        { status: 403 }
      );
    }

    const participant = await prisma.tenderParticipant.create({
      data: {
        tenderId: id,
        ...validation.data,
      },
    });

    return NextResponse.json({
      success: true,
      data: participant,
    });
  } catch (error) {
    console.error('Error creating participant:', error);
    return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 });
  }
}
