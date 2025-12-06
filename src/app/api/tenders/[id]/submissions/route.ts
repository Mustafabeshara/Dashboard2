/**
 * Tender Submission Documents API
 * Manages documents submitted for a tender (our bid documents)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Submission document types
const SUBMISSION_DOCUMENT_TYPES = [
  'SUBMISSION_TECHNICAL',
  'SUBMISSION_COMMERCIAL',
  'SUBMISSION_SAMPLES',
  'SUBMISSION_CERTIFICATE',
  'SUBMISSION_FEES',
  'SUBMISSION_BOND',
  'SUBMISSION_OTHER',
];

// GET /api/tenders/[id]/submissions - List all submission documents for a tender
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

    // Get all submission documents for this tender
    const documents = await prisma.document.findMany({
      where: {
        moduleType: 'TENDER',
        moduleId: id,
        type: { in: SUBMISSION_DOCUMENT_TYPES as any },
        isDeleted: false,
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: [
        { type: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Group documents by type
    const groupedDocuments = SUBMISSION_DOCUMENT_TYPES.reduce((acc, type) => {
      acc[type] = documents.filter(doc => doc.type === type);
      return acc;
    }, {} as Record<string, typeof documents>);

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        tenderNumber: tender.tenderNumber,
        title: tender.title,
        status: tender.status,
      },
      documents,
      groupedDocuments,
      summary: {
        total: documents.length,
        byType: SUBMISSION_DOCUMENT_TYPES.map(type => ({
          type,
          count: groupedDocuments[type]?.length || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching submission documents:', error);
    return NextResponse.json({ error: 'Failed to fetch submission documents' }, { status: 500 });
  }
}

// DELETE /api/tenders/[id]/submissions?documentId=xxx - Delete a submission document
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
        type: { in: SUBMISSION_DOCUMENT_TYPES as any },
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
    console.error('Error deleting submission document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
