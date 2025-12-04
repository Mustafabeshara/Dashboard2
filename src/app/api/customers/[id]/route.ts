/**
 * Customer Detail API Routes
 * Get, update, and delete individual customers
 */

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { cache } from '@/lib/cache';
import { requirePermission } from '@/lib/rbac';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['GOVERNMENT', 'PRIVATE', 'SEMI_GOVERNMENT']).optional(),
  registrationNumber: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  primaryContact: z.string().max(100).optional(),
  email: z.string().email().max(100).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  paymentTerms: z.string().max(200).optional(),
  creditLimit: z.number().optional(),
  currentBalance: z.number().optional(),
  departments: z.any().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/customers/[id] - Get customer details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Try cache first
    const cacheKey = `customer:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: {
            tenders: true,
            invoices: true,
          },
        },
        tenders: {
          where: { isDeleted: false },
          select: {
            id: true,
            tenderNumber: true,
            title: true,
            status: true,
            estimatedValue: true,
            currency: true,
            submissionDeadline: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        invoices: {
          where: { isDeleted: false },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            currency: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Cache the result
    await cache.set(cacheKey, customer, 300); // 5 minutes

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

// PATCH /api/customers/[id] - Update customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    requirePermission(session, 'customers', 'edit');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await params;
    const body = await request.json();

    // Validate with Zod
    const parseResult = updateCustomerSchema.safeParse(body);
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

    // Check if customer exists
    const existing = await prisma.customer.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.registrationNumber !== undefined)
      updateData.registrationNumber = validatedData.registrationNumber;
    if (validatedData.taxId !== undefined) updateData.taxId = validatedData.taxId;
    if (validatedData.address !== undefined) updateData.address = validatedData.address;
    if (validatedData.city !== undefined) updateData.city = validatedData.city;
    if (validatedData.country !== undefined) updateData.country = validatedData.country;
    if (validatedData.primaryContact !== undefined)
      updateData.primaryContact = validatedData.primaryContact;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.paymentTerms !== undefined)
      updateData.paymentTerms = validatedData.paymentTerms;
    if (validatedData.creditLimit !== undefined)
      updateData.creditLimit = validatedData.creditLimit;
    if (validatedData.currentBalance !== undefined)
      updateData.currentBalance = validatedData.currentBalance;
    if (validatedData.departments !== undefined)
      updateData.departments = validatedData.departments;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    // Clear cache
    await cache.delete(`customer:${id}`);
    await cache.clear('customers:');

    // Audit trail
    await audit.logUpdate('Customer', id, existing, customer, session.user.id);

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE /api/customers/[id] - Soft delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    requirePermission(session, 'customers', 'delete');

    // Rate limiting
    const rateLimitResult = await rateLimit(RateLimitPresets.strict)(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await params;

    // Check if customer exists
    const existing = await prisma.customer.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: {
            tenders: { where: { isDeleted: false } },
            invoices: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if customer has active tenders or invoices
    if (existing._count.tenders > 0 || existing._count.invoices > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete customer with active tenders or invoices',
          tenders: existing._count.tenders,
          invoices: existing._count.invoices,
        },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.customer.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });

    // Clear cache
    await cache.delete(`customer:${id}`);
    await cache.clear('customers:');

    // Audit trail
    await audit.logDelete('Customer', id, existing, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
