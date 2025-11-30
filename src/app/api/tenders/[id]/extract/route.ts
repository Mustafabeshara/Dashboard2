/**
 * Tender Extraction API
 * Creates tender from document extraction results
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/tenders/[id]/extract - Create tender from document extraction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  try {
    // Get document with latest extraction
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        extractions: {
          where: {
            extractionType: 'TENDER_EXTRACTION',
            status: 'COMPLETED',
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (document.extractions.length === 0) {
      return NextResponse.json(
        { error: 'No extraction found for this document' },
        { status: 404 }
      )
    }

    const extraction = document.extractions[0]
    const extractedData = extraction.extractedData as any

    // Validate extracted data
    if (!extractedData.reference || !extractedData.title) {
      return NextResponse.json(
        { error: 'Extracted data is incomplete. Reference and title are required.' },
        { status: 400 }
      )
    }

    // Check if tender with this number already exists
    const existing = await prisma.tender.findUnique({
      where: { tenderNumber: extractedData.reference },
    })

    if (existing) {
      return NextResponse.json(
        {
          error: 'Tender with this number already exists',
          existingTenderId: existing.id,
        },
        { status: 409 }
      )
    }

    // Parse closing date
    let closingDate: Date | null = null
    if (extractedData.closingDate) {
      try {
        closingDate = new Date(extractedData.closingDate)
        if (isNaN(closingDate.getTime())) {
          closingDate = null
        }
      } catch (e) {
        console.warn('Failed to parse closing date:', extractedData.closingDate)
      }
    }

    // Determine customer from organization
    let customerId: string | null = null
    if (extractedData.organization) {
      // Try to find existing customer by name
      const customer = await prisma.customer.findFirst({
        where: {
          name: {
            contains: extractedData.organization,
            mode: 'insensitive',
          },
        },
      })

      if (customer) {
        customerId = customer.id
      }
    }

    // Create tender
    const tender = await prisma.tender.create({
      data: {
        tenderNumber: extractedData.reference,
        title: extractedData.title,
        description: extractedData.notes || null,
        customerId,
        department: extractedData.organization || null,
        submissionDeadline: closingDate,
        status: 'DRAFT',
        products: extractedData.items || [],
        notes: extractedData.notes || null,
        documents: {
          documentId: document.id,
          extractionId: extraction.id,
          confidence: extraction.confidence,
        },
        createdById: document.uploadedById,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    })

    // Link document to tender
    await prisma.document.update({
      where: { id: documentId },
      data: {
        moduleType: 'TENDER',
        moduleId: tender.id,
      },
    })

    console.log(
      `[Tender] Created tender from extraction: ${tender.id} (${tender.tenderNumber})`
    )

    return NextResponse.json(
      {
        success: true,
        data: tender,
        message: 'Tender created from extraction successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating tender from extraction:', error)
    return NextResponse.json(
      { error: 'Failed to create tender from extraction' },
      { status: 500 }
    )
  }
}
