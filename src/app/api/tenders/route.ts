/**
 * Tenders API Routes
 * CRUD operations for tender management
 */

import { audit } from '@/lib/audit';
import { authOptions } from '@/lib/auth';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';
import { AuthenticationError } from '@/lib/errors/error-handler';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';
import { WebSocketHelpers } from '@/lib/websocket';
import { Prisma, TenderStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tenders - List all tenders with filters
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AuthenticationError();
    }

    // Permission check
    requirePermission(session, 'tenders', 'view');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.standard)(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);

    // Try cache first
    const cacheKey = CacheKeys.tenders.list(Object.fromEntries(searchParams));
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status') as TenderStatus | null;
    const customerId = searchParams.get('customerId');
    const search = searchParams.get('search');
    const showDeleted = searchParams.get('showDeleted') === 'true';

    // Build where clause
    const where: Prisma.TenderWhereInput = {
      isDeleted: showDeleted ? undefined : false,
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { tenderNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.tender.count({ where });

    // Get tenders
    const tenders = await prisma.tender.findMany({
      where,
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
      orderBy: [{ submissionDeadline: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    });

    const response = {
      success: true,
      data: tenders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache response
    await cache.set(cacheKey, response, CacheTTL.MEDIUM);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tenders:', error);
    return NextResponse.json({ error: 'Failed to fetch tenders' }, { status: 500 });
  }
}

// POST /api/tenders - Create a new tender
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AuthenticationError();
    }

    // Permission check
    requirePermission(session, 'tenders', 'create');

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
      currency = 'KWD',
      status = 'DRAFT',
      documents,
      products,
      technicalRequirements,
      commercialRequirements,
      bondRequired = false,
      bondAmount,
      createdById,
      notes,
    } = body;

    // Validate required fields
    if (!tenderNumber || !title) {
      return NextResponse.json({ error: 'Tender number and title are required' }, { status: 400 });
    }

    // Check if tender number already exists
    const existing = await prisma.tender.findUnique({
      where: { tenderNumber },
    });

    if (existing) {
      return NextResponse.json({ error: 'Tender number already exists' }, { status: 409 });
    }

    // Create tender with items in a transaction
    const tender = await prisma.$transaction(async tx => {
      // Create the tender
      const newTender = await tx.tender.create({
        data: {
          tenderNumber,
          title,
          description,
          customerId,
          department,
          category,
          submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
          openingDate: openingDate ? new Date(openingDate) : null,
          estimatedValue,
          currency,
          status,
          documents,
          products, // Keep for legacy support
          technicalRequirements,
          commercialRequirements,
          bondRequired,
          bondAmount,
          createdById,
          notes,
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

      // If products array exists (from AI extraction), create TenderItems
      if (products && Array.isArray(products) && products.length > 0) {
        const itemsToCreate = products.map((product: any, index: number) => ({
          tenderId: newTender.id,
          itemNumber: index + 1,
          description: product.itemDescription || product.name || '',
          quantity: product.quantity || 1,
          unit: product.unit || 'pcs',
          specifications: product.specifications || null,
          isParticipating: true,
          estimatedPrice: product.estimatedPrice || null,
        }));

        await tx.tenderItem.createMany({
          data: itemsToCreate,
        });
      }

      return newTender;
    });

    console.log(`[Tender] Created tender: ${tender.id} (${tender.tenderNumber})`);

    // Clear cache
    await cache.clear('tenders:list:');

    // Audit trail
    await audit.logCreate('Tender', tender.id, tender, createdById);

    // WebSocket notification
    WebSocketHelpers.notifyTenderCreated(tender, createdById);

    return NextResponse.json(
      {
        success: true,
        data: tender,
        message: 'Tender created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tender:', error);
    return NextResponse.json({ error: 'Failed to create tender' }, { status: 500 });
  }
}
