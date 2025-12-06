/**
 * Customers API Routes
 * CRUD operations for customer management
 */

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { cache } from '@/lib/cache';
import { requirePermission } from '@/lib/rbac';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { CustomerType, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200),
  type: z.enum(['GOVERNMENT', 'PRIVATE', 'CLINIC']).default('GOVERNMENT'),
  registrationNumber: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).default('Kuwait'),
  primaryContact: z.string().max(100).optional(),
  email: z.string().email().max(100).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  paymentTerms: z.string().max(200).optional(),
  creditLimit: z.number().optional(),
  departments: z.any().optional(),
});

// GET /api/customers - List all customers with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    requirePermission(session, 'customers', 'view');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.standard)(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const skip = (page - 1) * limit;

    // Filters
    const type = searchParams.get('type') as CustomerType | null;
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const showDeleted = searchParams.get('showDeleted') === 'true';

    // Try cache first
    const cacheKey = `customers:list:${page}:${limit}:${type}:${search}:${isActive}:${showDeleted}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build where clause
    const where: Prisma.CustomerWhereInput = {
      isDeleted: showDeleted ? undefined : false,
    };

    if (type) {
      where.type = type;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and customers in parallel
    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { tenders: true, invoices: true },
          },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    // Calculate stats
    const stats = {
      total,
      active: customers.filter(c => c.isActive).length,
      government: customers.filter(c => c.type === 'GOVERNMENT').length,
      private: customers.filter(c => c.type === 'PRIVATE').length,
      totalBalance: customers.reduce((sum, c) => sum + Number(c.currentBalance || 0), 0),
    };

    const response = {
      success: true,
      customers,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result
    await cache.set(cacheKey, response, 300); // 5 minutes

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    requirePermission(session, 'customers', 'create');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();

    // Validate with Zod
    const parseResult = createCustomerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;

    // Check if customer with same name already exists
    const existing = await prisma.customer.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: 'insensitive',
        },
        isDeleted: false,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Customer with this name already exists' },
        { status: 409 }
      );
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        registrationNumber: validatedData.registrationNumber,
        taxId: validatedData.taxId,
        address: validatedData.address,
        city: validatedData.city,
        country: validatedData.country,
        primaryContact: validatedData.primaryContact,
        email: validatedData.email || undefined,
        phone: validatedData.phone,
        paymentTerms: validatedData.paymentTerms,
        creditLimit: validatedData.creditLimit,
        departments: validatedData.departments,
      },
    });

    // Clear cache
    await cache.clear('customers:');

    // Audit trail
    await audit.logCreate('Customer', customer.id, customer, session.user.id);

    return NextResponse.json(
      {
        success: true,
        data: customer,
        message: 'Customer created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
