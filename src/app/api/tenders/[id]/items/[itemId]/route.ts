/**
 * Individual Tender Item API
 * Update/Delete individual tender items
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateItemSchema = z.object({
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  unit: z.string().min(1).optional(),
  specifications: z.string().optional(),
  isParticipating: z.boolean().optional(),
  estimatedPrice: z.number().positive().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// PATCH /api/tenders/[id]/items/[itemId] - Update item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if item exists
    const existing = await prisma.tenderItem.findUnique({
      where: { id: itemId, tenderId: id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tender item not found' }, { status: 404 });
    }

    const item = await prisma.tenderItem.update({
      where: { id: itemId },
      data: {
        ...validation.data,
        estimatedPrice:
          validation.data.estimatedPrice === null ? null : validation.data.estimatedPrice,
        notes: validation.data.notes === null ? null : validation.data.notes,
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error updating tender item:', error);
    return NextResponse.json({ error: 'Failed to update tender item' }, { status: 500 });
  }
}

// DELETE /api/tenders/[id]/items/[itemId] - Soft delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if item exists
    const existing = await prisma.tenderItem.findUnique({
      where: { id: itemId, tenderId: id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tender item not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.tenderItem.update({
      where: { id: itemId },
      data: { isDeleted: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Tender item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tender item:', error);
    return NextResponse.json({ error: 'Failed to delete tender item' }, { status: 500 });
  }
}
