/**
 * Suppliers API Routes
 * List and create suppliers
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/suppliers - List suppliers with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
      ...(isActive !== null && { isActive: isActive === 'true' }),
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ])

    // Calculate stats
    const stats = {
      total: await prisma.supplier.count({ where: { isDeleted: false } }),
      active: await prisma.supplier.count({ where: { isDeleted: false, isActive: true } }),
      categories: await prisma.supplier.groupBy({
        by: ['category'],
        where: { isDeleted: false },
        _count: true,
      }),
    }

    return NextResponse.json({
      success: true,
      suppliers,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const {
      name,
      code,
      category,
      contactPerson,
      email,
      phone,
      address,
      city,
      country,
      website,
      taxId,
      registrationNumber,
      paymentTerms,
      leadTime,
      rating,
      notes,
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate code
    if (code) {
      const existing = await prisma.supplier.findUnique({
        where: { code },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Supplier code already exists' },
          { status: 400 }
        )
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        code,
        category,
        contactPerson,
        email,
        phone,
        address,
        city,
        country: country || 'Kuwait',
        website,
        taxId,
        registrationNumber,
        paymentTerms,
        leadTime: leadTime ? parseInt(leadTime) : null,
        rating: rating ? parseFloat(rating) : null,
        notes,
      },
    })

    console.log(`[Supplier] Created supplier: ${supplier.id} (${supplier.name})`)

    return NextResponse.json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    })
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}
