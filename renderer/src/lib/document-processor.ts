/**
 * Document Processing Utilities
 * Handles text extraction from various document formats including PDFs
 */

import { logger } from './logger';

/**
 * Extract text from raw PDF buffer when pdf-parse is not available
 * This provides basic text extraction as a fallback
 */
function extractTextFromRawBuffer(bufferString: string): string {
  // Basic text extraction patterns for common PDF text encodings
  // This is a fallback that tries to extract readable text from binary buffer

  // Remove non-printable characters but keep spaces and basic punctuation
  let text = bufferString.replace(/[^\x20-\x7E\n\r\t]/g, '')

  // Clean up common PDF artifacts
  text = text.replace(/BT\s*\/F\d+\s+\d+\s+Tf\s*[\d.]+\s+TL\s*[\d.]+\s+Tc\s*[\d.]+\s+Tw\s*[\d.]+\s+Tz\s*[\d.]+\s+TL/g, '')
  text = text.replace(/\/F\d+\s+\d+\s+Tf/g, '')
  text = text.replace(/\d+\.\d+\s+TL/g, '')

  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ').trim()

  // If we get very little text, provide a helpful message
  if (text.length < 50) {
    return 'Unable to extract text from PDF. The document may be image-based or use an unsupported encoding. Please use the web interface for full PDF processing capabilities.'
  }

  return text
}

interface ProcessedDocument {
  text: string;
  images: string[]; // Array of image URLs
  metadata?: {
    totalPages?: number;
    currentPage?: number;
    isMultiPage?: boolean;
    chunkInfo?: {
      chunkIndex: number;
      totalChunks: number;
      isLastChunk: boolean;
    };
  };
}

/**
 * Extract text content from a document buffer with chunking support for large documents
 * @param buffer - Document buffer
 * @param mimeType - MIME type of the document
 * @param chunkSize - Maximum size of text chunks (in characters)
 * @returns Processed document with text and images
 */
export async function extractTextFromBufferWithChunking(
  buffer: Buffer, 
  mimeType: string, 
  chunkSize: number = 50000 // Default to 50K characters per chunk
): Promise<ProcessedDocument[]> {
  try {
    // First extract the full document
    const fullDocument = await extractTextFromBuffer(buffer, mimeType);
    
    // If it's a small document, return as a single chunk
    if (fullDocument.text.length <= chunkSize) {
      return [{
        ...fullDocument,
        metadata: {
          ...fullDocument.metadata,
          chunkInfo: {
            chunkIndex: 0,
            totalChunks: 1,
            isLastChunk: true
          }
        }
      }];
    }
    
    // For large documents, split into chunks
    const chunks: ProcessedDocument[] = [];
    const text = fullDocument.text;
    const totalChunks = Math.ceil(text.length / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.substring(start, end);
      
      chunks.push({
        text: chunkText,
        images: [], // No images in chunks
        metadata: {
          ...fullDocument.metadata,
          chunkInfo: {
            chunkIndex: i,
            totalChunks,
            isLastChunk: i === totalChunks - 1
          }
        }
      });
    }
    
    logger.info('Document chunked successfully', {
      context: {
        totalChunks,
        documentLength: text.length
      }
    });
    
    return chunks;
  } catch (error) {
    logger.error('Document chunking failed', error as Error);
    throw new Error(`Failed to chunk document: ${(error as Error).message}`);
  }
}

/**
 * Extract text content from a document buffer
 * @param buffer - Document buffer
 * @param mimeType - MIME type of the document
 * @returns Processed document with text and images
 */
export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<ProcessedDocument> {
  try {
    // Handle PDF files
    if (mimeType === 'application/pdf') {
      return await extractTextFromPDF(buffer);
    }
    
    // Handle text files
    if (mimeType.startsWith('text/')) {
      return {
        text: buffer.toString('utf-8'),
        images: []
      };
    }
    
    // Handle other document types (placeholder)
    logger.warn(`Unsupported document type for text extraction: ${mimeType}`);
    return {
      text: `[Text extraction not implemented for ${mimeType}]`,
      images: []
    };
  } catch (error) {
    logger.error('Document text extraction failed', error as Error);
    throw new Error(`Failed to extract text from document: ${(error as Error).message}`);
  }
}

/**
 * Extract text content from a PDF buffer
 * @param buffer - PDF buffer
 * @returns Processed document with text and images
 */
async function extractTextFromPDF(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    logger.info('Starting PDF text extraction', {
      context: {
        bufferSize: buffer.length,
        bufferType: typeof buffer
      }
    });

    // Check if pdf-parse is available
    let pdfParse: any
    try {
      pdfParse = require('pdf-parse')
    } catch (importError) {
      logger.warn('pdf-parse not available, using fallback extraction', {
        context: { importError: importError instanceof Error ? importError.message : 'Unknown error' }
      })

      // Graceful degradation: Extract basic text patterns from buffer
      const bufferString = buffer.toString('utf-8', 0, Math.min(10000, buffer.length))

      const pdfData = {
        text: extractTextFromRawBuffer(bufferString),
        numpages: 1,
        info: {
          fallback: true,
          reason: 'pdf-parse not available',
          extractedChars: bufferString.length
        }
      };

      logger.info('Fallback PDF text extraction completed', {
        context: { extractedChars: pdfData.text.length, numpages: pdfData.numpages }
      });

      return {
        content: pdfData.text,
        metadata: {
          pages: pdfData.numpages,
          encoding: 'utf-8',
          extractedWith: 'fallback',
          fallbackReason: 'pdf-parse unavailable'
        },
        success: true
      };
    }

    // Use pdf-parse if available
    const pdfData = await pdfParse(buffer);

    logger.info('PDF text extraction completed', {
      context: {
        textLength: pdfData.text.length,
        numPages: pdfData.numpages,
        info: pdfData.info
      }
    });
    
    return {
      text: pdfData.text,
      images: [], // pdf-parse doesn't extract images, but we keep this for consistency
      metadata: {
        totalPages: pdfData.numpages,
        isMultiPage: pdfData.numpages > 1
      }
    };
  } catch (error) {
    logger.error('PDF text extraction failed', error as Error);
    throw new Error(`PDF text extraction failed: ${(error as Error).message}`);
  }
}

/**
 * Download a file from URL and return as buffer
 * @param url - File URL
 * @returns File buffer
 */
export async function downloadFileAsBuffer(url: string): Promise<Buffer> {
  try {
    logger.info('Downloading file', { context: { url } });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    logger.info('File downloaded successfully', {
      context: { 
        url,
        size: buffer.length
      }
    });
    
    return buffer;
  } catch (error) {
    logger.error('File download failed', error as Error, { url });
    throw error;
  }
}

export default {
  extractTextFromBuffer,
  downloadFileAsBuffer
};