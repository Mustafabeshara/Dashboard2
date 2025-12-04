/**
 * Document Processing Utilities
 * Handles text extraction from various document formats including PDFs
 */

import { logger } from './logger';

interface ProcessedDocument {
  text: string;
  images: string[];
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
 */
export async function extractTextFromBufferWithChunking(
  buffer: Buffer,
  mimeType: string,
  chunkSize: number = 50000
): Promise<ProcessedDocument[]> {
  try {
    const fullDocument = await extractTextFromBuffer(buffer, mimeType);

    if (fullDocument.text.length <= chunkSize) {
      return [
        {
          ...fullDocument,
          metadata: {
            ...fullDocument.metadata,
            chunkInfo: {
              chunkIndex: 0,
              totalChunks: 1,
              isLastChunk: true,
            },
          },
        },
      ];
    }

    const chunks: ProcessedDocument[] = [];
    const text = fullDocument.text;
    const totalChunks = Math.ceil(text.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.substring(start, end);

      chunks.push({
        text: chunkText,
        images: [],
        metadata: {
          ...fullDocument.metadata,
          chunkInfo: {
            chunkIndex: i,
            totalChunks,
            isLastChunk: i === totalChunks - 1,
          },
        },
      });
    }

    logger.info('Document chunked successfully', {
      context: {
        totalChunks,
        documentLength: text.length,
      },
    });

    return chunks;
  } catch (error) {
    logger.error('Document chunking failed', error as Error);
    throw new Error(`Failed to chunk document: ${(error as Error).message}`);
  }
}

/**
 * Extract text content from a document buffer
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ProcessedDocument> {
  try {
    const maxSize = 50 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: 50MB)`);
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    logger.info('Processing document', {
      context: {
        mimeType,
        size: buffer.length,
      },
    });

    if (mimeType === 'application/pdf') {
      return await extractTextFromPDF(buffer);
    }

    if (mimeType.startsWith('text/')) {
      return {
        text: buffer.toString('utf-8'),
        images: [],
      };
    }

    // For images, return empty text - the AI will process them visually
    if (mimeType.startsWith('image/')) {
      return {
        text: '[Image document - requires visual AI processing]',
        images: [],
      };
    }

    logger.warn(`Unsupported document type for text extraction: ${mimeType}`);
    return {
      text: `[Text extraction not implemented for ${mimeType}]`,
      images: [],
    };
  } catch (error) {
    logger.error('Document text extraction failed', error as Error);
    throw new Error(`Failed to extract text from document: ${(error as Error).message}`);
  }
}

/**
 * Extract text content from a PDF buffer using pdf-parse
 * Uses a robust approach that works with Next.js
 */
async function extractTextFromPDF(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    logger.info('Starting PDF text extraction', {
      context: {
        bufferSize: buffer.length,
      },
    });

    // Use pdf-parse with a workaround for Next.js bundling issues
    // We need to require it dynamically to avoid bundling issues
    let pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number; info: unknown }>;

    try {
      // Try the standard import first
      const pdfModule = require('pdf-parse');
      pdfParse = pdfModule.default || pdfModule;
    } catch {
      // If that fails, try another approach
      logger.warn('Standard pdf-parse import failed, trying alternative');

      // Return a placeholder that prompts AI processing
      return {
        text: '[PDF requires visual AI extraction - text extraction unavailable]',
        images: [],
        metadata: {
          totalPages: 0,
          isMultiPage: false,
        },
      };
    }

    const pdfData = await pdfParse(buffer);

    logger.info('PDF text extraction completed', {
      context: {
        textLength: pdfData.text.length,
        numPages: pdfData.numpages,
      },
    });

    return {
      text: pdfData.text,
      images: [],
      metadata: {
        totalPages: pdfData.numpages,
        isMultiPage: pdfData.numpages > 1,
      },
    };
  } catch (error) {
    logger.error('PDF text extraction failed', error as Error);

    // Return a fallback that indicates AI should process visually
    return {
      text: '[PDF text extraction failed - document will be processed visually by AI]',
      images: [],
      metadata: {
        totalPages: 0,
        isMultiPage: false,
      },
    };
  }
}

/**
 * Download a file from URL and return as buffer
 */
export async function downloadFileAsBuffer(url: string): Promise<Buffer> {
  try {
    logger.info('Downloading file', { context: { url: url.substring(0, 100) } });

    // Handle local file URLs
    if (url.startsWith('/api/files/')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const fileKey = decodeURIComponent(url.replace('/api/files/', ''));
      const localPath = path.join(process.cwd(), 'uploads', fileKey);
      return await fs.readFile(localPath);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info('File downloaded successfully', {
      context: {
        size: buffer.length,
      },
    });

    return buffer;
  } catch (error) {
    logger.error('File download failed', error as Error);
    throw error;
  }
}

export default {
  extractTextFromBuffer,
  downloadFileAsBuffer,
};
