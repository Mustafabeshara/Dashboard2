/**
 * Tender Status Update API
 * Handles tender status transitions with proper validation
 */

import { audit } from '@/lib/audit';
import { authOptions } from '@/lib/auth';
import { cache } from '@/lib/cache';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { TenderStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// Valid status transitions for tenders
const VALID_STATUS_TRANSITIONS: Record<TenderStatus, TenderStatus[]> = {
  DRAFT: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['SUBMITTED', 'DRAFT', 'CANCELLED'],
  SUBMITTED: ['WON', 'LOST', 'IN_PROGRESS'],
  WON: [],
  LOST: [],
  CANCELLED: ['DRAFT'],
};

// Roles that can change tender status to final states
const FINAL_STATUS_ROLES = ['ADMIN', 'CEO', 'SALES_MANAGER'];

function canTransitionStatus(
  currentStatus: TenderStatus,
  newStatus: TenderStatus
): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

function isFinalStatus(status: TenderStatus): boolean {
  return status === 'WON' || status === 'LOST';
}

// PATCH /api/tenders/[id]/status - Update tender status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    requirePermission(session, 'tenders', 'edit');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { status, notes, reason } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status is a valid TenderStatus
    const validStatuses: TenderStatus[] = [
      'DRAFT',
      'IN_PROGRESS',
      'SUBMITTED',
      'WON',
      'LOST',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', validStatuses },
        { status: 400 }
      );
    }

    // Check if tender exists
    const existing = await prisma.tender.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Skip if status is the same
    if (existing.status === status) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: 'Status unchanged',
      });
    }

    // Validate status transition
    if (!canTransitionStatus(existing.status, status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${existing.status} to ${status}`,
          currentStatus: existing.status,
          allowedTransitions: VALID_STATUS_TRANSITIONS[existing.status],
        },
        { status: 400 }
      );
    }

    // Check if user has permission to set final status
    if (isFinalStatus(status)) {
      if (!FINAL_STATUS_ROLES.includes(session.user.role)) {
        return NextResponse.json(
          {
            error: 'You do not have permission to mark tenders as won or lost',
            requiredRoles: FINAL_STATUS_ROLES,
          },
          { status: 403 }
        );
      }
    }

    // Require reason for certain status changes
    if ((status === 'LOST' || status === 'CANCELLED') && !reason) {
      return NextResponse.json(
        { error: `Reason is required when setting status to ${status}` },
        { status: 400 }
      );
    }

    // Build updated notes
    let updatedNotes = existing.notes || '';
    if (notes || reason) {
      const timestamp = new Date().toISOString();
      const statusNote = `[${timestamp}] Status changed to ${status} by ${session.user.email || session.user.id}`;
      const reasonNote = reason ? `\nReason: ${reason}` : '';
      const additionalNotes = notes ? `\nNotes: ${notes}` : '';

      updatedNotes = updatedNotes
        ? `${updatedNotes}\n\n${statusNote}${reasonNote}${additionalNotes}`
        : `${statusNote}${reasonNote}${additionalNotes}`;
    }

    // Update status
    const tender = await prisma.tender.update({
      where: { id },
      data: {
        status,
        notes: updatedNotes || existing.notes,
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
    });

    // Clear cache
    await cache.delete(`tender:${id}`);
    await cache.clear('tenders:');

    // Audit trail
    await audit.logUpdate(
      'Tender',
      id,
      { status: existing.status, notes: existing.notes },
      { status: tender.status, notes: tender.notes },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: tender,
      message: `Tender status updated to ${status}`,
      previousStatus: existing.status,
    });
  } catch (error) {
    console.error('Error updating tender status:', error);
    return NextResponse.json(
      { error: 'Failed to update tender status' },
      { status: 500 }
    );
  }
}
