/**
 * Tenders API Routes
 * CRUD operations for tender management
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TenderStatus, Prisma } from '@prisma/client'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'
import { audit, AuditAction } from '@/lib/audit'
import { WebSocketHelpers } from '@/lib/websocket'

// GET /api/tenders - List all tenders with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Try cache first
    const cacheKey = CacheKeys.tenders.list(Object.fromEntries(searchParams))
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Filters
    const status = searchParams.get('status') as TenderStatus | null
    const customerId = searchParams.get('customerId')
    const search = searchParams.get('search')
    const showDeleted = searchParams.get('showDeleted') === 'true'

    // Build where clause
    const where: Prisma.TenderWhereInput = {
      isDeleted: showDeleted ? undefined : false,
    }

    if (status) {
      where.status = status
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (search) {
      where.OR = [
        { tenderNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const total = await prisma.tender.count({ where })

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
      orderBy: [
        { submissionDeadline: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    })

    const response = {
      success: true,
      data: tenders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Cache response
    await cache.set(cacheKey, response, CacheTTL.MEDIUM)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching tenders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenders' },
      { status: 500 }
    )
  }
}

// POST /api/tenders - Create new tender
export async function POST(request: NextRequest) {
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
    } = body

    // Validate required fields
    if (!tenderNumber || !title) {
      return NextResponse.json(
        { error: 'Tender number and title are required' },
        { status: 400 }
      )
    }

    // Check if tender number already exists
    const existing = await prisma.tender.findUnique({
      where: { tenderNumber },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Tender number already exists' },
        { status: 409 }
      )
    }

    // Create tender
    const tender = await prisma.tender.create({
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
        products,
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
    })

    console.log(`[Tender] Created tender: ${tender.id} (${tender.tenderNumber})`)

    // Clear cache
    await cache.clear('tenders:list:')

    // Audit trail
    await audit.logCreate('Tender', tender.id, tender, createdById)

    // WebSocket notification
    WebSocketHelpers.notifyTenderCreated(tender, createdById)

    return NextResponse.json(
      {
        success: true,
        data: tender,
        message: 'Tender created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating tender:', error)
    return NextResponse.json(
      { error: 'Failed to create tender' },
      { status: 500 }
    )
  }
}
