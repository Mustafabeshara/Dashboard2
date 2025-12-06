/**
 * Supplier Detail API Routes
 * Get, update, and delete individual suppliers with proper authentication
 */

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';
import { audit } from '@/lib/audit';
import { z } from 'zod';

// Rate limiter for supplier detail endpoints
const rateLimiter = rateLimit(RateLimitPresets.standard);

// Validation schema for updating supplier
const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email().max(100).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  website: z.string().url().max(200).optional().or(z.literal('')),
  taxId: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
  paymentTerms: z.string().max(200).optional(),
  leadTime: z.union([z.number(), z.string()]).optional(),
  rating: z.union([z.number(), z.string()]).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

// UUID validation
const uuidSchema = z.string().uuid('Invalid supplier ID format');

// GET /api/suppliers/[id] - Get supplier details
async function handleGet(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;

  // Validate UUID format
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ error: 'Invalid supplier ID format' }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!supplier) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
  }

  if (supplier.isDeleted) {
    return NextResponse.json({ error: 'Supplier has been deleted' }, { status: 410 });
  }

  return NextResponse.json({
    success: true,
    data: supplier,
  });
}

// PATCH /api/suppliers/[id] - Update supplier
async function handlePatch(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;

  // Validate UUID format
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ error: 'Invalid supplier ID format' }, { status: 400 });
  }

  const body = await request.json();

  // Validate input with Zod
  const parseResult = updateSupplierSchema.safeParse(body);
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
    isActive,
  } = parseResult.data;

  // Check if supplier exists
  const existing = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
  }

  if (existing.isDeleted) {
    return NextResponse.json({ error: 'Cannot update deleted supplier' }, { status: 410 });
  }

  // Check for duplicate code
  if (code && code !== existing.code) {
    const duplicate = await prisma.supplier.findUnique({
      where: { code },
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Supplier code already exists' }, { status: 400 });
    }
  }

  // Update supplier
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(category !== undefined && { category }),
      ...(contactPerson !== undefined && { contactPerson }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country }),
      ...(website !== undefined && { website }),
      ...(taxId !== undefined && { taxId }),
      ...(registrationNumber !== undefined && { registrationNumber }),
      ...(paymentTerms !== undefined && { paymentTerms }),
      ...(leadTime !== undefined && { leadTime: leadTime ? parseInt(String(leadTime)) : null }),
      ...(rating !== undefined && { rating: rating ? parseFloat(String(rating)) : null }),
      ...(notes !== undefined && { notes }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  // Clear cache
  await cache.delete(`supplier:${id}`);
  await cache.clear('suppliers:');

  // Audit trail
  await audit.logUpdate('Supplier', id, existing, supplier, request.user.id);

  logger.info('Supplier updated', {
    context: {
      supplierId: supplier.id,
      supplierName: supplier.name,
      updatedBy: request.user.id,
    },
  });

  return NextResponse.json({
    success: true,
    data: supplier,
    message: 'Supplier updated successfully',
  });
}

// DELETE /api/suppliers/[id] - Soft delete supplier
async function handleDelete(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;

  // Validate UUID format
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ error: 'Invalid supplier ID format' }, { status: 400 });
  }

  // Check if supplier exists
  const existing = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
  }

  if (existing.isDeleted) {
    return NextResponse.json({ error: 'Supplier already deleted' }, { status: 410 });
  }

  // Soft delete
  await prisma.supplier.update({
    where: { id },
    data: {
      isDeleted: true,
      isActive: false,
    },
  });

  // Clear cache
  await cache.delete(`supplier:${id}`);
  await cache.clear('suppliers:');

  // Audit trail
  await audit.logDelete('Supplier', id, existing, request.user.id);

  logger.info('Supplier deleted', {
    context: {
      supplierId: existing.id,
      supplierName: existing.name,
      deletedBy: request.user.id,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Supplier deleted successfully',
  });
}

// Export with authentication and authorization middleware
export const GET = withAuth(handleGet);
export const PATCH = withAuth(handlePatch, { roleGroup: 'MANAGEMENT' });
export const DELETE = withAuth(handleDelete, { roleGroup: 'MANAGEMENT' });
