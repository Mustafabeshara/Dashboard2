/**
 * Tender Source Documents API
 * Manages original tender documents (source PDFs, images uploaded for extraction)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Source document types (not submission types)
const SOURCE_DOCUMENT_TYPES = ['TENDER_DOCUMENT', 'TENDER_SOURCE', 'OTHER'];

// GET /api/tenders/[id]/documents - List all source documents for a tender
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify tender exists
    const tender = await prisma.tender.findUnique({
      where: { id, isDeleted: false },
      select: { id: true, tenderNumber: true, title: true, status: true },
    });

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Get all source documents for this tender (non-submission documents)
    const documents = await prisma.document.findMany({
      where: {
        moduleType: 'TENDER',
        moduleId: id,
        type: { in: SOURCE_DOCUMENT_TYPES as any },
        isDeleted: false,
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        tenderNumber: tender.tenderNumber,
        title: tender.title,
        status: tender.status,
      },
      documents,
      total: documents.length,
    });
  } catch (error) {
    console.error('Error fetching source documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// DELETE /api/tenders/[id]/documents?documentId=xxx - Delete a source document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Verify document exists and belongs to this tender
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        moduleType: 'TENDER',
        moduleId: id,
        type: { in: SOURCE_DOCUMENT_TYPES as any },
        isDeleted: false,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Soft delete the document
    await prisma.document.update({
      where: { id: documentId },
      data: { isDeleted: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting source document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
