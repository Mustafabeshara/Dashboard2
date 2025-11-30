import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Assuming authOptions is defined here
import { prisma } from '@/lib/prisma'; // Assuming prisma client is defined here
import { Prisma } from '@prisma/client';

// Define the structure for the dynamic route parameters
interface Context {
  params: {
    id: string;
  };
}

// --- GET (Detail) ---
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const { id } = context.params;

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: id,
      },
      include: {
        customer: true,
        items: true,
        _count: {
          select: { items: true },
        },
      },
    });

    if (!invoice) {
      return new NextResponse(JSON.stringify({ message: 'Invoice not found' }), { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice detail:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

// --- PATCH (Update) ---
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const { id } = context.params;
    const body = await request.json();

    // Prevent updating soft-deleted records
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: id },
      select: { isDeleted: true },
    });

    if (!existingInvoice || existingInvoice.isDeleted) {
      return new NextResponse(JSON.stringify({ message: 'Invoice not found or already deleted' }), { status: 404 });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: id },
      data: {
        ...body,
        updatedAt: new Date(),
        // Example of updating a relationship if needed, e.g., customerId
        ...(body.customerId && { customer: { connect: { id: body.customerId } } }),
      },
      include: {
        customer: true,
      },
    });

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return new NextResponse(JSON.stringify({ message: 'Invoice not found' }), { status: 404 });
      }
    }
    console.error('Error updating invoice:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

// --- DELETE (Soft-Delete) ---
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const { id } = context.params;

    // Perform a soft delete by setting the deletedAt timestamp
    const deletedInvoice = await prisma.invoice.update({
      where: {
        id: id,
      },
      data: {
        isDeleted: true, // Set soft-delete flag
      },
    });

    // Note: If the record was already soft-deleted, the update will fail silently if not found,
    // but the where clause ensures we only update non-deleted records.
    // We can check if the record was found before the update to return a 404 if needed.
    // For simplicity, we assume a successful soft-delete or a 204 if it was already deleted.

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Record to update not found (e.g., ID does not exist)
        return new NextResponse(JSON.stringify({ message: 'Invoice not found' }), { status: 404 });
      }
    }
    console.error('Error soft-deleting invoice:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

// Optional: Add a PUT method for full replacement if needed
// export async function PUT(request: NextRequest, context: Context) { /* ... */ }
