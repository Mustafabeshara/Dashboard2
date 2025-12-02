/**
 * Bulk Tender Upload API
 * Handles ZIP file uploads containing multiple tender PDFs for batch AI extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extractTenderFromText } from '@/lib/ai/tender-extraction'
import { extractTextFromBuffer } from '@/lib/document-processor'
import { preprocessDocument } from '@/lib/document-preprocessor'
import { logger } from '@/lib/logger'
import AdmZip from 'adm-zip'

interface ExtractedTender {
  fileName: string
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
  mimeType: string
): Promise<ExtractedTender> {
  const startTime = Date.now()
  
  try {
    logger.info(`[BulkUpload] Processing ${fileName}...`)

    // Extract text from document
    let extractedText = ''
    try {
      const result = await extractTextFromBuffer(fileBuffer, mimeType)
      extractedText = typeof result === 'string' ? result : result.text || ''
      logger.info(`[BulkUpload] Extracted ${extractedText.length} characters from ${fileName}`)
    } catch (textError) {
      logger.warn(`[BulkUpload] Text extraction failed for ${fileName}`)
      throw new Error('Failed to extract text from document')
    }

    if (!extractedText || extractedText.length < 50) {
      throw new Error('Insufficient text extracted from document')
    }

    // Preprocess the text
    const preprocessedResult = await preprocessDocument(extractedText)
    const preprocessedText = preprocessedResult.content || extractedText
    
    // Extract tender data using AI
    const extractedData = await withTimeout(
      extractTenderFromText(preprocessedText),
      EXTRACTION_TIMEOUT_MS,
      'Extraction timeout'
    )

    const confidence = extractedData.confidence?.overall || 0
    const processingTimeMs = Date.now() - startTime

    logger.info(`[BulkUpload] Successfully extracted ${fileName} in ${processingTimeMs}ms`)

    return {
      fileName,
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
    logger.error(`[BulkUpload] Failed to process ${fileName}`)
    return {
      fileName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * POST /api/tenders/bulk-upload
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
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!zipFile.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'File must be a ZIP archive' }, { status: 400 })
    }

    if (zipFile.size > MAX_ZIP_SIZE) {
      return NextResponse.json({ error: 'ZIP file too large. Maximum 100MB' }, { status: 400 })
    }

    logger.info(`[BulkUpload] Processing ZIP: ${zipFile.name} (${zipFile.size} bytes)`)

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer())
    const zip = new AdmZip(zipBuffer)
    const zipEntries = zip.getEntries()

    const supportedFiles = zipEntries.filter((entry) => {
      if (entry.isDirectory) return false
      const ext = '.' + (entry.entryName.toLowerCase().split('.').pop() || '')
      return SUPPORTED_TYPES.includes(ext)
    })

    if (supportedFiles.length === 0) {
      return NextResponse.json(
        { error: 'No supported files found in ZIP (PDF, PNG, JPG)' },
        { status: 400 }
      )
    }

    logger.info(`[BulkUpload] Found ${supportedFiles.length} files`)

    const results: ExtractedTender[] = []
    let successful = 0
    let failed = 0

    for (const entry of supportedFiles) {
      const fileName = entry.entryName.split('/').pop() || entry.entryName
      const fileBuffer = entry.getData()
      
      const ext = fileName.toLowerCase().split('.').pop()
      const mimeType =
        ext === 'pdf' ? 'application/pdf' :
        ext === 'png' ? 'image/png' :
        'image/jpeg'

      const result = await processSingleFile(fileName, fileBuffer, mimeType)
      results.push(result)
      
      if (result.success) successful++
      else failed++
    }

    logger.info(`[BulkUpload] Done: ${successful} success, ${failed} failed`)

    return NextResponse.json({
      success: true,
      totalFiles: supportedFiles.length,
      successful,
      failed,
      results,
    })
  } catch (error) {
    logger.error('[BulkUpload] Error:', error as Error)
    return NextResponse.json({ error: 'Failed to process ZIP file' }, { status: 500 })
  }
}
