/**
 * Bulk Tender Upload API
 * Handles ZIP file uploads containing multiple tender PDFs for batch AI extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractTenderFromDocument, extractTenderFromText } from '@/lib/ai/tender-extraction'
import { extractTextFromBuffer } from '@/lib/document-processor'
import { preprocessDocument } from '@/lib/document-preprocessor'
import { logger } from '@/lib/logger'
import { S3Service } from '@/lib/s3'
import AdmZip from 'adm-zip'

interface ExtractedTender {
  fileName: string
  documentId?: string
  success: boolean
  data?: {
    reference: string
    title: string
    organization: string
    closingDate: string
    items: Array<{
      itemDescription: string
      quantity: number
      unit: string
    }>
    notes: string
  }
  error?: string
  confidence?: number
}

interface BulkUploadResult {
  totalFiles: number
  successful: number
  failed: number
  results: ExtractedTender[]
}

// Timeout for individual extraction (2 minutes)
const EXTRACTION_TIMEOUT_MS = 120000

// Maximum ZIP file size (100MB)
const MAX_ZIP_SIZE = 100 * 1024 * 1024

// Supported file types inside ZIP
const SUPPORTED_TYPES = ['.pdf', '.png', '.jpg', '.jpeg']

/**
 * Helper to run extraction with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ])
}

/**
 * Process a single file from the ZIP
 */
async function processSingleFile(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  userId: string
): Promise<ExtractedTender> {
  const startTime = Date.now()
  
  try {
    logger.info(`[BulkUpload] Processing ${fileName}...`)

    // Upload to S3
    const s3Service = new S3Service()
    const s3Key = `tenders/bulk/${Date.now()}-${fileName}`
    const uploadResult = await s3Service.uploadBuffer(fileBuffer, s3Key, mimeType)
    
    if (!uploadResult.success || !uploadResult.url) {
      throw new Error('Failed to upload file to S3')
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        name: fileName,
        originalName: fileName,
        mimeType: mimeType,
        size: fileBuffer.length,
        url: uploadResult.url,
        type: 'TENDER_DOCUMENT',
        status: 'PROCESSING',
        uploadedById: userId,
      },
    })

    // Extract text from document
    let extractedText = ''
    try {
      extractedText = await extractTextFromBuffer(fileBuffer, mimeType)
      logger.info(`[BulkUpload] Extracted ${extractedText.length} characters from ${fileName}`)
    } catch (textError) {
      logger.warn(`[BulkUpload] Text extraction failed for ${fileName}, using direct PDF processing`)
    }

    // Preprocess the text
    const preprocessed = preprocessDocument(extractedText)
    
    // Extract tender data using AI
    let extractedData
    if (preprocessed.text && preprocessed.text.length > 100) {
      // Use text-based extraction if we have good text
      extractedData = await withTimeout(
        extractTenderFromText(preprocessed.text),
        EXTRACTION_TIMEOUT_MS,
        'Extraction timeout'
      )
    } else {
      // Use document-based extraction with file URL
      extractedData = await withTimeout(
        extractTenderFromDocument(uploadResult.url, mimeType),
        EXTRACTION_TIMEOUT_MS,
        'Extraction timeout'
      )
    }

    // Update document status
    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'COMPLETED' },
    })

    // Create extraction record
    await prisma.documentExtraction.create({
      data: {
        documentId: document.id,
        extractionType: 'TENDER_EXTRACTION',
        provider: 'ai-fallback-chain',
        model: 'multi-provider',
        extractedData: extractedData,
        status: 'COMPLETED',
        processingTimeMs: Date.now() - startTime,
      },
    })

    const confidence = extractedData.confidence?.overall || 0

    return {
      fileName,
      documentId: document.id,
      success: true,
      data: {
        reference: extractedData.reference || '',
        title: extractedData.title || '',
        organization: extractedData.organization || '',
        closingDate: extractedData.closingDate || '',
        items: extractedData.items || [],
        notes: extractedData.notes || '',
      },
      confidence,
    }
  } catch (error) {
    logger.error(`[BulkUpload] Failed to process ${fileName}:`, error)
    return {
      fileName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * POST /api/tenders/bulk-upload
 * Upload a ZIP file containing multiple tender documents
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const zipFile = formData.get('file') as File | null

    if (!zipFile) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!zipFile.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'File must be a ZIP archive' },
        { status: 400 }
      )
    }

    // Validate file size
    if (zipFile.size > MAX_ZIP_SIZE) {
      return NextResponse.json(
        { error: 'ZIP file too large. Maximum size is 100MB' },
        { status: 400 }
      )
    }

    logger.info(`[BulkUpload] Processing ZIP file: ${zipFile.name} (${zipFile.size} bytes)`)

    // Read ZIP file
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer())
    const zip = new AdmZip(zipBuffer)
    const zipEntries = zip.getEntries()

    // Filter supported files
    const supportedFiles = zipEntries.filter((entry) => {
      if (entry.isDirectory) return false
      const ext = entry.entryName.toLowerCase().split('.').pop()
      return SUPPORTED_TYPES.includes(`.${ext}`)
    })

    if (supportedFiles.length === 0) {
      return NextResponse.json(
        { error: 'No supported files found in ZIP (PDF, PNG, JPG supported)' },
        { status: 400 }
      )
    }

    logger.info(`[BulkUpload] Found ${supportedFiles.length} supported files in ZIP`)

    // Process each file
    const results: ExtractedTender[] = []
    let successful = 0
    let failed = 0

    for (const entry of supportedFiles) {
      const fileName = entry.entryName.split('/').pop() || entry.entryName
      const fileBuffer = entry.getData()
      
      // Determine MIME type
      const ext = fileName.toLowerCase().split('.').pop()
      const mimeType =
        ext === 'pdf' ? 'application/pdf' :
        ext === 'png' ? 'image/png' :
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        'application/octet-stream'

      const result = await processSingleFile(
        fileName,
        fileBuffer,
        mimeType,
        session.user.id
      )

      results.push(result)
      
      if (result.success) {
        successful++
      } else {
        failed++
      }
    }

    const response: BulkUploadResult = {
      totalFiles: supportedFiles.length,
      successful,
      failed,
      results,
    }

    logger.info(`[BulkUpload] Completed: ${successful} successful, ${failed} failed out of ${supportedFiles.length}`)

    return NextResponse.json({
      success: true,
      ...response,
    })
  } catch (error) {
    logger.error('[BulkUpload] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process ZIP file' },
      { status: 500 }
    )
  }
}
