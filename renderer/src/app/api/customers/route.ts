/**
 * Customers API Routes
 * CRUD operations for customer management
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CustomerType, Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/customers - List all customers with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Filters
    const type = searchParams.get('type') as CustomerType | null
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const showDeleted = searchParams.get('showDeleted') === 'true'

    // Build where clause
    const where: Prisma.CustomerWhereInput = {
      isDeleted: showDeleted ? undefined : false,
    }

    if (type) {
      where.type = type
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const total = await prisma.customer.count({ where })

    // Get customers
    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { tenders: true, invoices: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
      skip,
      take: limit,
    })

    // Calculate stats
    const stats = {
      total,
      active: customers.filter(c => c.isActive).length,
      government: customers.filter(c => c.type === 'GOVERNMENT').length,
      private: customers.filter(c => c.type === 'PRIVATE').length,
      totalBalance: customers.reduce((sum, c) => sum + Number(c.currentBalance || 0), 0),
    }

    return NextResponse.json({
      success: true,
      customers,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const {
      name,
      type = 'GOVERNMENT',
      registrationNumber,
      taxId,
      address,
      city,
      country = 'Kuwait',
      primaryContact,
      email,
      phone,
      paymentTerms,
      creditLimit,
      departments,
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      )
    }

    // Check if customer with same name already exists
    const existing = await prisma.customer.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Customer with this name already exists' },
        { status: 409 }
      )
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name,
        type,
        registrationNumber,
        taxId,
        address,
        city,
        country,
        primaryContact,
        email,
        phone,
        paymentTerms,
        creditLimit,
        departments,
      },
    })

    console.log(`[Customer] Created customer: ${customer.id} (${customer.name})`)

    return NextResponse.json(
      {
        success: true,
        data: customer,
        message: 'Customer created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
