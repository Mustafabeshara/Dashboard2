import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Assuming authOptions is defined here
import { prisma } from '@/lib/prisma'; // Assuming prisma client is defined here
import { Prisma } from '@prisma/client';

// --- GET (List, Search, Filter, Pagination) ---
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('q') || '';
    const statusFilter = searchParams.get('status');
    const customerIdFilter = searchParams.get('customerId');

    const skip = (page - 1) * pageSize;

    const where: Prisma.InvoiceWhereInput = {
      isDeleted: false, // Soft-delete filter
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(statusFilter && { status: statusFilter as any }),
      ...(customerIdFilter && { customerId: customerIdFilter }),
    };

    const [invoices, totalCount] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true }, // Invoice items count
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: invoices,
      meta: {
        totalCount,
        totalPages,
        currentPage: page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

// --- POST (Create) ---
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    // Basic validation (in a real app, use Zod or similar)
    if (!body.invoiceNumber || !body.customerId || !body.totalAmount) {
      return new NextResponse(JSON.stringify({ message: 'Missing required fields' }), { status: 400 });
    }

    const newInvoice = await prisma.invoice.create({
      data: {
        ...body,
        // Assuming the user creating the invoice is the one logged in
        createdByUserId: session.user.id, 
        // Example of connecting relationships
        customer: {
          connect: { id: body.customerId },
        },
        // Add other required fields
      },
      include: {
        customer: true,
      },
    });

    return new NextResponse(JSON.stringify(newInvoice), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors, e.g., unique constraint violation
      if (error.code === 'P2002') {
        return new NextResponse(JSON.stringify({ message: 'Invoice number already exists' }), { status: 409 });
      }
    }
    console.error('Error creating invoice:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

// Optional: Add a HEAD method for preflight checks if needed, but usually not required for simple CRUD
// export async function HEAD(request: NextRequest) { /* ... */ }
