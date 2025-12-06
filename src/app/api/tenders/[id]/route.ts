/**
 * Tender Detail API Routes
 * Operations for individual tenders
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

// GET /api/tenders/[id] - Get tender by ID
export async function GET(
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
    requirePermission(session, 'tenders', 'view');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.standard)(request);
    if (rateLimitResult) return rateLimitResult;

    // Try cache first
    const cacheKey = `tender:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const tender = await prisma.tender.findFirst({
      where: { id, isDeleted: false },
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
        items: {
          where: { isDeleted: false },
          orderBy: { itemNumber: 'asc' },
        },
        _count: {
          select: {
            items: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Calculate tender summary
    const itemsCount = tender._count.items;
    const participatingItems = tender.items.filter(item => item.isParticipating).length;

    const response = {
      ...tender,
      summary: {
        totalItems: itemsCount,
        participatingItems,
        daysUntilDeadline: tender.submissionDeadline
          ? Math.ceil(
              (new Date(tender.submissionDeadline).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
        isOverdue: tender.submissionDeadline
          ? new Date(tender.submissionDeadline) < new Date()
          : false,
      },
    };

    // Cache the result
    await cache.set(cacheKey, response, 300); // 5 minutes

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching tender:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tender' },
      { status: 500 }
    );
  }
}

// PATCH /api/tenders/[id] - Update tender
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

    // Rate limiting (stricter for mutations)
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();

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
    } = body;

    // Check if tender exists
    const existing = await prisma.tender.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Validate status transition if status is being changed
    if (status && status !== existing.status) {
      if (!canTransitionStatus(existing.status, status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${existing.status} to ${status}`,
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
    }

    // If tender number is being changed, check for duplicates
    if (tenderNumber && tenderNumber !== existing.tenderNumber) {
      const duplicate = await prisma.tender.findUnique({
        where: { tenderNumber },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'Tender number already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (tenderNumber !== undefined) updateData.tenderNumber = tenderNumber;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (department !== undefined) updateData.department = department;
    if (category !== undefined) updateData.category = category;
    if (submissionDeadline !== undefined) {
      updateData.submissionDeadline = submissionDeadline
        ? new Date(submissionDeadline)
        : null;
    }
    if (openingDate !== undefined) {
      updateData.openingDate = openingDate ? new Date(openingDate) : null;
    }
    if (estimatedValue !== undefined) updateData.estimatedValue = estimatedValue;
    if (currency !== undefined) updateData.currency = currency;
    if (status !== undefined) updateData.status = status;
    if (documents !== undefined) updateData.documents = documents;
    if (products !== undefined) updateData.products = products;
    if (technicalRequirements !== undefined)
      updateData.technicalRequirements = technicalRequirements;
    if (commercialRequirements !== undefined)
      updateData.commercialRequirements = commercialRequirements;
    if (bondRequired !== undefined) updateData.bondRequired = bondRequired;
    if (bondAmount !== undefined) updateData.bondAmount = bondAmount;
    if (notes !== undefined) updateData.notes = notes;

    // Update tender
    const tender = await prisma.tender.update({
      where: { id },
      data: updateData,
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
    await audit.logUpdate('Tender', id, existing, tender, session.user.id);

    return NextResponse.json({
      success: true,
      data: tender,
      message:
        status && status !== existing.status
          ? `Tender status updated to ${status}`
          : 'Tender updated successfully',
    });
  } catch (error) {
    console.error('Error updating tender:', error);
    return NextResponse.json(
      { error: 'Failed to update tender' },
      { status: 500 }
    );
  }
}

// DELETE /api/tenders/[id] - Soft delete tender
export async function DELETE(
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
    requirePermission(session, 'tenders', 'delete');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    // Check if tender exists
    const existing = await prisma.tender.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Prevent deletion of won/submitted tenders
    if (existing.status === 'WON' || existing.status === 'SUBMITTED') {
      return NextResponse.json(
        {
          error: `Cannot delete a tender with status ${existing.status}. Change status first.`,
        },
        { status: 400 }
      );
    }

    // Soft delete tender and its items
    await prisma.$transaction([
      prisma.tender.update({
        where: { id },
        data: { isDeleted: true },
      }),
      prisma.tenderItem.updateMany({
        where: { tenderId: id },
        data: { isDeleted: true },
      }),
    ]);

    // Clear cache
    await cache.delete(`tender:${id}`);
    await cache.clear('tenders:');

    // Audit trail
    await audit.logDelete('Tender', id, existing, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Tender deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tender:', error);
    return NextResponse.json(
      { error: 'Failed to delete tender' },
      { status: 500 }
    );
  }
}
