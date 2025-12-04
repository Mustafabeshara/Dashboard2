/**
 * Bulk Tender Upload API
 * Handles ZIP file uploads containing multiple tender PDFs for batch AI extraction
 */

import { extractTenderFromText, extractTenderFromDocument } from '@/lib/ai/tender-extraction';
import { authOptions } from '@/lib/auth';
import { preprocessDocument } from '@/lib/document-preprocessor';
import { extractTextFromBuffer } from '@/lib/document-processor';
import { logger } from '@/lib/logger';
import { storagePut, generateFileKey } from '@/lib/storage';
import AdmZip from 'adm-zip';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

interface ExtractedTender {
  fileName: string;
  success: boolean;
  data?: {
    reference: string;
    title: string;
    organization: string;
    closingDate: string;
    items: Array<{
      itemDescription: string;
      quantity: number;
      unit: string;
    }>;
    notes: string;
  };
  error?: string;
  confidence?: number;
}

// Timeout for individual extraction (2 minutes)
const EXTRACTION_TIMEOUT_MS = 120000;

// Maximum ZIP file size (100MB)
const MAX_ZIP_SIZE = 100 * 1024 * 1024;

// Supported file types inside ZIP
const SUPPORTED_TYPES = ['.pdf', '.png', '.jpg', '.jpeg'];

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
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ]);
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
  const startTime = Date.now();

  try {
    logger.info(`[BulkUpload] Processing ${fileName}...`);

    let extractedData;

    // First try text extraction
    let extractedText = '';
    let useVisualExtraction = false;

    try {
      const result = await extractTextFromBuffer(fileBuffer, mimeType);
      extractedText = typeof result === 'string' ? result : result.text || '';

      // Check if text extraction was meaningful
      if (
        !extractedText ||
        extractedText.length < 100 ||
        extractedText.includes('[PDF text extraction failed') ||
        extractedText.includes('[PDF requires visual AI extraction')
      ) {
        useVisualExtraction = true;
        logger.info(`[BulkUpload] Text extraction insufficient for ${fileName}, using visual AI`);
      } else {
        logger.info(`[BulkUpload] Extracted ${extractedText.length} characters from ${fileName}`);
      }
    } catch (textError) {
      useVisualExtraction = true;
      logger.warn(`[BulkUpload] Text extraction failed for ${fileName}, using visual AI`);
    }

    if (useVisualExtraction) {
      // Check if Gemini is available for visual extraction
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      const geminiAvailable = geminiKey && geminiKey.length > 20 && !geminiKey.includes('your-');

      if (!geminiAvailable) {
        // If Gemini is not available, we cannot do visual extraction
        // Return an error for this file suggesting text extraction failed
        logger.warn(`[BulkUpload] Cannot process ${fileName}: text extraction failed and GEMINI_API_KEY not configured for visual extraction`);
        return {
          fileName,
          success: false,
          error: 'PDF text extraction failed. Configure GEMINI_API_KEY for visual AI extraction, or use a text-based PDF.',
        };
      }

      // Save file temporarily and use visual extraction
      const fileKey = generateFileKey(userId, fileName, 'bulk-upload');
      const { url } = await storagePut(fileKey, fileBuffer, mimeType);

      // For local storage, we need to construct the full URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;

      // Use visual AI extraction
      extractedData = await withTimeout(
        extractTenderFromDocument(fullUrl, mimeType),
        EXTRACTION_TIMEOUT_MS,
        'Extraction timeout'
      );
    } else {
      // Preprocess the text
      const preprocessedResult = await preprocessDocument(extractedText);
      const preprocessedText = preprocessedResult.content || extractedText;

      // Extract tender data using AI text extraction
      extractedData = await withTimeout(
        extractTenderFromText(preprocessedText),
        EXTRACTION_TIMEOUT_MS,
        'Extraction timeout'
      );
    }

    const confidence = extractedData.confidence?.overall || 0;
    const processingTimeMs = Date.now() - startTime;

    logger.info(`[BulkUpload] Successfully extracted ${fileName} in ${processingTimeMs}ms`);

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
    };
  } catch (error) {
    logger.error(`[BulkUpload] Failed to process ${fileName}`, error as Error);
    return {
      fileName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * POST /api/tenders/bulk-upload
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const zipFile = formData.get('file') as File | null;

    if (!zipFile) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!zipFile.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'File must be a ZIP archive' }, { status: 400 });
    }

    if (zipFile.size > MAX_ZIP_SIZE) {
      return NextResponse.json({ error: 'ZIP file too large. Maximum 100MB' }, { status: 400 });
    }

    logger.info(`[BulkUpload] Processing ZIP: ${zipFile.name} (${zipFile.size} bytes)`);

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    const supportedFiles = zipEntries.filter(entry => {
      if (entry.isDirectory) return false;
      const ext = '.' + (entry.entryName.toLowerCase().split('.').pop() || '');
      return SUPPORTED_TYPES.includes(ext);
    });

    if (supportedFiles.length === 0) {
      return NextResponse.json(
        { error: 'No supported files found in ZIP (PDF, PNG, JPG)' },
        { status: 400 }
      );
    }

    logger.info(`[BulkUpload] Found ${supportedFiles.length} files`);

    const results: ExtractedTender[] = [];
    let successful = 0;
    let failed = 0;

    // Get user ID for file storage
    const userId = (session.user as { id?: string }).id || 'anonymous';

    for (const entry of supportedFiles) {
      const fileName = entry.entryName.split('/').pop() || entry.entryName;

      // Skip macOS metadata files
      if (fileName.startsWith('._') || fileName === '.DS_Store') {
        logger.info(`[BulkUpload] Skipping macOS metadata file: ${fileName}`);
        continue;
      }

      const fileBuffer = entry.getData();

      const ext = fileName.toLowerCase().split('.').pop();
      const mimeType =
        ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';

      const result = await processSingleFile(fileName, fileBuffer, mimeType, userId);
      results.push(result);

      if (result.success) successful++;
      else failed++;
    }

    logger.info(`[BulkUpload] Done: ${successful} success, ${failed} failed`);

    return NextResponse.json({
      success: true,
      totalFiles: supportedFiles.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    logger.error('[BulkUpload] Error:', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process ZIP file';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
