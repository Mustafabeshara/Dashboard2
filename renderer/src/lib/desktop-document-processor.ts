/**
 * Desktop Document Processor
 * Handles document processing in the desktop application with file system access
 */

import { promises as fs } from 'fs';
import { extractTextFromBuffer } from './document-processor';
import { preprocessDocument } from './document-preprocessor';
import { extractTenderFromText } from './ai/tender-extraction';
import { logger } from './logger';

export interface DesktopDocumentProcessingResult {
  success: boolean;
  textExtracted: boolean;
  ocrPerformed: boolean;
  extractedData?: any;
  confidence?: number;
  errors?: string[];
  processingTime: number;
  fileSize: number;
  textLength?: number;
}

/**
 * Process a document file in the desktop application
 * @param filePath - Path to the document file
 * @param mimeType - MIME type of the document
 * @returns Processing result with extracted data
 */
export async function processDesktopDocument(
  filePath: string,
  mimeType: string
): Promise<DesktopDocumentProcessingResult> {
  const startTime = Date.now();
  let buffer: Buffer;
  let fileSize = 0;

  try {
    // Read file from local filesystem
    logger.info('Reading document file from filesystem', { filePath });
    buffer = await fs.readFile(filePath);
    fileSize = buffer.length;
    logger.info('File read successfully', { fileSize });

    // Extract text from document
    logger.info('Extracting text from document', { mimeType });
    const processedDoc = await extractTextFromBuffer(buffer, mimeType);
    logger.info('Text extracted successfully', { textLength: processedDoc.text.length });

    // Preprocess the extracted text
    logger.info('Preprocessing extracted text');
    const preprocessed = await preprocessDocument(processedDoc.text, {
      cleanText: true,
      normalizeText: true,
      removeHeadersFooters: true
    });
    logger.info('Text preprocessing completed', { 
      originalLength: processedDoc.text.length,
      processedLength: preprocessed.metadata.processedLength,
      confidence: preprocessed.metadata.confidence
    });

    // Extract tender data from preprocessed text
    logger.info('Extracting tender data from preprocessed text');
    const extractedData = await extractTenderFromText(preprocessed.content);
    logger.info('Tender data extracted', { 
      confidence: extractedData.confidence?.overall,
      itemsCount: extractedData.items?.length || 0
    });

    return {
      success: true,
      textExtracted: true,
      ocrPerformed: false, // OCR would be implemented separately
      extractedData,
      confidence: extractedData.confidence?.overall,
      processingTime: Date.now() - startTime,
      fileSize,
      textLength: preprocessed.metadata.processedLength
    };

  } catch (error: any) {
    logger.error('Desktop document processing failed', error as Error, { filePath });
    return {
      success: false,
      textExtracted: false,
      ocrPerformed: false,
      errors: [error.message || 'Unknown error'],
      processingTime: Date.now() - startTime,
      fileSize
    };
  }
}

/**
 * Process multiple documents
 * @param filePaths - Array of file paths to process
 * @param mimeTypes - Array of MIME types corresponding to each file
 * @returns Array of processing results
 */
export async function processMultipleDesktopDocuments(
  filePaths: string[],
  mimeTypes: string[]
): Promise<DesktopDocumentProcessingResult[]> {
  const results: DesktopDocumentProcessingResult[] = [];
  
  for (let i = 0; i < filePaths.length; i++) {
    const result = await processDesktopDocument(filePaths[i], mimeTypes[i]);
    results.push(result);
  }
  
  return results;
}

/**
 * Get document statistics
 * @param filePath - Path to the document file
 * @returns File statistics
 */
export async function getDocumentStats(filePath: string): Promise<{
  exists: boolean;
  size: number;
  created: Date | null;
  modified: Date | null;
}> {
  try {
    const stats = await fs.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false,
      size: 0,
      created: null,
      modified: null
    };
  }
}