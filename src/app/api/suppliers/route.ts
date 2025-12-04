/**
 * Suppliers API Routes
 * List and create suppliers with proper authentication
 */

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';
import { audit } from '@/lib/audit';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Rate limiter for suppliers endpoints
const rateLimiter = rateLimit(RateLimitPresets.standard);

// Validation schema for creating supplier
const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200),
  code: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email().max(100).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).default('Kuwait'),
  website: z.string().url().max(200).optional().or(z.literal('')),
  taxId: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
  paymentTerms: z.string().max(200).optional(),
  leadTime: z.union([z.number(), z.string()]).optional(),
  rating: z.union([z.number(), z.string()]).optional(),
  notes: z.string().max(2000).optional(),
});

// GET /api/suppliers - List suppliers with filters
async function handleGet(request: AuthenticatedRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category');
  const isActive = searchParams.get('isActive');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const skip = (page - 1) * limit;

  // Validate search length to prevent DoS
  if (search.length > 200) {
    return NextResponse.json({ error: 'Search query too long' }, { status: 400 });
  }

  const where: Prisma.SupplierWhereInput = {
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
  };

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.count({ where }),
  ]);

  // Calculate stats with optimized query
  const [totalCount, activeCount, categories] = await Promise.all([
    prisma.supplier.count({ where: { isDeleted: false } }),
    prisma.supplier.count({ where: { isDeleted: false, isActive: true } }),
    prisma.supplier.groupBy({
      by: ['category'],
      where: { isDeleted: false },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    success: true,
    suppliers,
    stats: {
      total: totalCount,
      active: activeCount,
      categories,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/suppliers - Create new supplier
async function handlePost(request: AuthenticatedRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json();

  // Validate input with Zod
  const parseResult = createSupplierSchema.safeParse(body);
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return NextResponse.json(
      { error: 'Validation failed', details: errors },
      { status: 400 }
    );
  }

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
  } = parseResult.data;

  // Check for duplicate code
  if (code) {
    const existing = await prisma.supplier.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: 'Supplier code already exists' }, { status: 400 });
    }
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      code: code || undefined,
      category: category || undefined,
      contactPerson: contactPerson || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      city: city || undefined,
      country: country || 'Kuwait',
      website: website || undefined,
      taxId: taxId || undefined,
      registrationNumber: registrationNumber || undefined,
      paymentTerms: paymentTerms || undefined,
      leadTime: leadTime ? parseInt(String(leadTime)) : null,
      rating: rating ? parseFloat(String(rating)) : null,
      notes: notes || undefined,
    },
  });

  // Clear cache
  await cache.clear('suppliers:');

  // Audit trail
  await audit.logCreate('Supplier', supplier.id, supplier, request.user.id);

  logger.info('Supplier created', {
    context: {
      supplierId: supplier.id,
      supplierName: supplier.name,
      createdBy: request.user.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: supplier,
    message: 'Supplier created successfully',
  });
}

// Export with authentication middleware
export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost, { roleGroup: 'MANAGEMENT' });
