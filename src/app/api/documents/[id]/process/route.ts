/**
 * Document Processing API
 * Enhanced with direct PDF processing via Gemini file_url
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTenderFromDocument, validateTenderExtraction, needsHumanReview } from '@/lib/ai/tender-extraction'
import { ExtractionType } from '@prisma/client'
import { ocr } from '@/lib/ocr'
import { audit } from '@/lib/audit'
import { WebSocketHelpers } from '@/lib/websocket'
import { email, EmailTemplate } from '@/lib/email'

// Map document types to extraction types
const DOCUMENT_TO_EXTRACTION_TYPE: Record<string, ExtractionType> = {
  TENDER_DOCUMENT: 'TENDER_EXTRACTION',
  TENDER_SPECS: 'TENDER_EXTRACTION',
  TENDER_BOQ: 'TENDER_EXTRACTION',
  TENDER_COMMERCIAL: 'TENDER_EXTRACTION',
  INVOICE: 'INVOICE_EXTRACTION',
  EXPENSE_RECEIPT: 'EXPENSE_EXTRACTION',
  RECEIPT: 'EXPENSE_EXTRACTION',
  DELIVERY_NOTE: 'DELIVERY_EXTRACTION',
  PRODUCT_DATASHEET: 'PRODUCT_EXTRACTION',
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const startTime = Date.now()

  try {
    // Get document
    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if document has a URL (required for AI processing)
    if (!document.url) {
      return NextResponse.json(
        { error: 'Document URL not available. Please ensure document is uploaded to S3.' },
        { status: 400 }
      )
    }

    // Update document status to processing
    await prisma.document.update({
      where: { id },
      data: { status: 'PROCESSING' },
    })

    // Get extraction type
    const extractionType = DOCUMENT_TO_EXTRACTION_TYPE[document.type] || 'OCR_TEXT'

    // Check if extraction already exists
    const existingExtraction = await prisma.documentExtraction.findFirst({
      where: {
        documentId: id,
        extractionType,
        status: 'COMPLETED',
      },
    })

    if (existingExtraction) {
      return NextResponse.json({
        success: true,
        extraction: existingExtraction,
        message: 'Document already processed',
        cached: true,
      })
    }

    // Create pending extraction record
    const extraction = await prisma.documentExtraction.create({
      data: {
        documentId: id,
        extractionType,
        provider: 'pending',
        model: 'pending',
        extractedData: {},
        status: 'PROCESSING',
      },
    })

    // Only tender extraction is implemented with new system
    // Other document types will be added later
    if (extractionType !== 'TENDER_EXTRACTION') {
      await prisma.documentExtraction.update({
        where: { id: extraction.id },
        data: {
          status: 'FAILED',
          errorMessage: `Extraction type ${extractionType} not yet implemented with new system`,
        },
      })

      await prisma.document.update({
        where: { id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        {
          success: false,
          error: `Extraction type ${extractionType} not yet implemented`,
        },
        { status: 501 }
      )
    }

    // Check if document needs OCR (scanned image)
    let documentUrl = document.url
    if (ocr.isScannedDocument(document.mimeType)) {
      try {
        console.log(`[ProcessDocument] Document appears to be scanned, running OCR...`)
        const ocrResult = await ocr.extractText(document.url)
        console.log(`[ProcessDocument] OCR extracted ${ocrResult.text.length} characters with ${(ocrResult.confidence * 100).toFixed(1)}% confidence`)
        // OCR result can be used if needed, but Gemini can also process images directly
      } catch (error) {
        console.warn('[ProcessDocument] OCR failed, using direct file processing:', error)
      }
    }

    // Extract tender data using new system
    console.log(`[ProcessDocument] Starting tender extraction for document ${id}`)
    
    let extractedData
    try {
      extractedData = await extractTenderFromDocument(documentUrl, document.mimeType)
    } catch (extractError: any) {
      console.error(`[ProcessDocument] Extraction failed:`, extractError)
      
      await prisma.documentExtraction.update({
        where: { id: extraction.id },
        data: {
          status: 'FAILED',
          errorMessage: extractError.message || 'Extraction failed',
          processingTime: Date.now() - startTime,
        },
      })

      await prisma.document.update({
        where: { id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        {
          success: false,
          error: extractError.message || 'Extraction failed',
          processingTime: Date.now() - startTime,
        },
        { status: 500 }
      )
    }

    // Validate extraction
    const validationErrors = validateTenderExtraction(extractedData)
    const requiresReview = needsHumanReview(extractedData)

    const processingTime = Date.now() - startTime

    // Calculate overall confidence
    const confidence = extractedData.confidence?.overall || 0

    // Update extraction with results
    const updatedExtraction = await prisma.documentExtraction.update({
      where: { id: extraction.id },
      data: {
        provider: 'gemini', // Primary provider for PDFs
        model: 'gemini-2.5-flash',
        extractedData: extractedData as any,
        confidence,
        status: 'COMPLETED',
        processingTime,
        isApproved: !requiresReview && validationErrors.length === 0,
      },
    })

    // Update document status
    await prisma.document.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    })

    console.log(`[ProcessDocument] Successfully processed document ${id}`)
    console.log(`[ProcessDocument] Confidence: ${confidence}, Requires Review: ${requiresReview}`)
    console.log(`[ProcessDocument] Validation Errors: ${validationErrors.length}`)

    // Audit trail
    await audit.logUpdate('Document', id, { status: 'PROCESSING' }, { status: 'PROCESSED' })

    // WebSocket notification
    WebSocketHelpers.notifyDocumentProcessed({ id, fileName: document.name, status: 'PROCESSED' }, document.uploadedById || 'system')

    // Email notification if user exists
    const user = document.uploadedById ? await prisma.user.findUnique({ where: { id: document.uploadedById } }) : null
    if (user?.email) {
      await email.sendTemplate(EmailTemplate.DOCUMENT_PROCESSED, user.email, {
        documentName: document.name,
        documentType: document.type,
        confidence: Math.round(confidence * 100),
        requiresReview,
        validationErrors: validationErrors.length,
      }).catch(err => console.error('Failed to send email:', err))
    }

    return NextResponse.json({
      success: true,
      extraction: updatedExtraction,
      extractedData,
      confidence,
      requiresReview,
      validationErrors,
      processingTime,
    })
  } catch (error) {
    console.error('Error processing document:', error)

    // Update document status
    await prisma.document.update({
      where: { id },
      data: { status: 'FAILED' },
    }).catch(console.error)

    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    )
  }
}

// GET /api/documents/[id]/process - Get extraction status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        extractions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      document,
      latestExtraction: document.extractions[0] || null,
    })
  } catch (error) {
    console.error('Error getting extraction status:', error)
    return NextResponse.json(
      { error: 'Failed to get extraction status' },
      { status: 500 }
    )
  }
}
