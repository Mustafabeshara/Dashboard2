/**
 * Document Processing API
 * Triggers AI extraction on uploaded documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractFromDocument, summarize, translateArabicToEnglish } from '@/lib/ai/ai-service-manager'
import { ExtractionType, ExtractionStatus, Prisma } from '@prisma/client'
import { readFile } from 'fs/promises'

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

// Extract text from document (placeholder - in production use proper PDF/OCR libraries)
async function extractTextFromDocument(
  filePath: string,
  mimeType: string
): Promise<{ text: string; images: string[] }> {
  const images: string[] = []

  // For images, convert to base64
  if (mimeType.startsWith('image/')) {
    const buffer = await readFile(filePath)
    const base64 = buffer.toString('base64')
    images.push(`data:${mimeType};base64,${base64}`)
    return { text: '', images }
  }

  // For text files, read directly
  if (mimeType === 'text/plain' || mimeType === 'text/csv') {
    const buffer = await readFile(filePath)
    return { text: buffer.toString('utf-8'), images }
  }

  // For PDFs and other documents, we'd use a PDF parsing library
  // For now, return placeholder (in production: use pdf-parse, tesseract, etc.)
  if (mimeType === 'application/pdf') {
    // In production: Use pdf-parse or similar library
    // const pdfParse = require('pdf-parse')
    // const dataBuffer = await readFile(filePath)
    // const data = await pdfParse(dataBuffer)
    // return { text: data.text, images: [] }
    return {
      text: '[PDF text extraction requires pdf-parse library - install with npm install pdf-parse]',
      images
    }
  }

  return { text: '', images }
}

export async function POST(
  request: NextRequest,
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

    // Extract text/images from document
    const { text, images } = await extractTextFromDocument(
      document.path,
      document.mimeType
    )

    // Determine document type for AI extraction
    let docType: 'tender' | 'invoice' | 'expense' | 'delivery' = 'tender'
    if (extractionType === 'INVOICE_EXTRACTION') docType = 'invoice'
    else if (extractionType === 'EXPENSE_EXTRACTION') docType = 'expense'
    else if (extractionType === 'DELIVERY_EXTRACTION') docType = 'delivery'

    // Run AI extraction
    const result = await extractFromDocument(docType, text, images)

    const processingTime = Date.now() - startTime

    if (result.success && result.data) {
      // Update extraction with results
      const updatedExtraction = await prisma.documentExtraction.update({
        where: { id: extraction.id },
        data: {
          provider: 'ai-service',
          model: 'fallback-chain',
          extractedData: result.data as Prisma.InputJsonValue,
          status: 'COMPLETED',
          processingTime,
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

      return NextResponse.json({
        success: true,
        extraction: updatedExtraction,
        processingTime,
      })
    } else {
      // Update extraction with error
      await prisma.documentExtraction.update({
        where: { id: extraction.id },
        data: {
          status: 'FAILED',
          errorMessage: result.error || 'Unknown error',
          processingTime,
        },
      })

      // Update document status
      await prisma.document.update({
        where: { id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Extraction failed',
          processingTime,
        },
        { status: 500 }
      )
    }
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

// POST /api/documents/[id]/process/summarize - Generate summary
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { maxLength = 200 } = await request.json()

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        extractions: {
          where: { status: 'COMPLETED' },
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

    // Get text content
    const { text } = await extractTextFromDocument(document.path, document.mimeType)

    // Generate summary
    const result = await summarize(text, maxLength)

    if (result.success) {
      // Save summary as extraction
      const extraction = await prisma.documentExtraction.create({
        data: {
          documentId: id,
          extractionType: 'SUMMARIZATION',
          provider: result.provider,
          model: result.model,
          extractedData: { summary: result.content },
          status: 'COMPLETED',
          processingTime: result.latency,
        },
      })

      return NextResponse.json({
        success: true,
        summary: result.content,
        extraction,
      })
    }

    return NextResponse.json(
      { error: result.error || 'Summarization failed' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error summarizing document:', error)
    return NextResponse.json(
      { error: 'Failed to summarize document' },
      { status: 500 }
    )
  }
}

// PATCH /api/documents/[id]/process/translate - Translate Arabic to English
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get text content
    const { text } = await extractTextFromDocument(document.path, document.mimeType)

    // Translate Arabic text
    const result = await translateArabicToEnglish(text)

    if (result.success) {
      // Save translation as extraction
      const extraction = await prisma.documentExtraction.create({
        data: {
          documentId: id,
          extractionType: 'TRANSLATION',
          provider: result.provider,
          model: result.model,
          extractedData: {
            originalLanguage: 'ar',
            targetLanguage: 'en',
            translation: result.content,
          },
          status: 'COMPLETED',
          processingTime: result.latency,
        },
      })

      return NextResponse.json({
        success: true,
        translation: result.content,
        extraction,
      })
    }

    return NextResponse.json(
      { error: result.error || 'Translation failed' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error translating document:', error)
    return NextResponse.json(
      { error: 'Failed to translate document' },
      { status: 500 }
    )
  }
}
