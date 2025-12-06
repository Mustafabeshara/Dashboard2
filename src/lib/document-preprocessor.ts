/**
 * Document Preprocessing Utilities
 * Enhances document quality before AI processing
 */

import { logger } from './logger';

interface PreprocessingOptions {
  enhanceImages?: boolean;
  cleanText?: boolean;
  normalizeText?: boolean;
  removeHeadersFooters?: boolean;
  language?: string;
}

interface PreprocessingResult {
  content: string;
  metadata: {
    originalLength: number;
    processedLength: number;
    enhancementsApplied: string[];
    confidence: number;
  };
}

/**
 * Preprocess document content to improve AI extraction quality
 * @param content - Raw document content
 * @param options - Preprocessing options
 * @returns Preprocessed content with metadata
 */
export async function preprocessDocument(content: string, options: PreprocessingOptions = {}): Promise<PreprocessingResult> {
  try {
    const originalLength = content.length;
    let processedContent = content;
    const enhancementsApplied: string[] = [];
    
    logger.info('Starting document preprocessing', {
      context: { 
        originalLength,
        options 
      }
    });
    
    // Apply text cleaning if requested
    if (options.cleanText !== false) { // Default to true
      processedContent = cleanText(processedContent);
      enhancementsApplied.push('textCleaning');
    }
    
    // Apply text normalization if requested
    if (options.normalizeText !== false) { // Default to true
      processedContent = normalizeText(processedContent);
      enhancementsApplied.push('textNormalization');
    }
    
    // Remove headers and footers if requested
    if (options.removeHeadersFooters) {
      processedContent = removeHeadersFooters(processedContent);
      enhancementsApplied.push('headerFooterRemoval');
    }
    
    // Calculate confidence based on enhancements applied
    const confidence = Math.min(0.5 + (enhancementsApplied.length * 0.1), 1.0);
    
    logger.info('Document preprocessing completed', {
      context: {
        originalLength,
        processedLength: processedContent.length,
        enhancementsApplied,
        confidence
      }
    });
    
    return {
      content: processedContent,
      metadata: {
        originalLength,
        processedLength: processedContent.length,
        enhancementsApplied,
        confidence
      }
    };
  } catch (error) {
    logger.error('Document preprocessing failed', error as Error);
    throw new Error(`Document preprocessing failed: ${(error as Error).message}`);
  }
}

/**
 * Clean text by removing unnecessary characters and formatting
 * @param text - Text to clean
 * @returns Cleaned text
 */
function cleanText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Remove excessive newlines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove special characters that might interfere with parsing
  cleaned = cleaned.replace(/[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\n\r\t.,\-:;(){}\[\]"'?!@#$%^&*_+=<>]/g, '');
  
  return cleaned;
}

/**
 * Normalize text by standardizing formats
 * @param text - Text to normalize
 * @returns Normalized text
 */
function normalizeText(text: string): string {
  // Standardize date formats (convert various formats to YYYY-MM-DD)
  let normalized = text.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g, '$3-$2-$1');
  
  // Standardize number formats (remove commas from numbers)
  normalized = normalized.replace(/(\d+),(\d+)/g, '$1$2');
  
  // Normalize Arabic text (handle different forms of same characters)
  normalized = normalizeArabicText(normalized);
  
  return normalized;
}

/**
 * Normalize Arabic text by handling different character forms
 * @param text - Arabic text to normalize
 * @returns Normalized Arabic text
 */
function normalizeArabicText(text: string): string {
  // Map of Arabic character variations
  const arabicMap: Record<string, string> = {
    'آ': 'ا',
    'أ': 'ا',
    'إ': 'ا',
    'ة': 'ه'
  };
  
  let normalized = text;
  for (const [from, to] of Object.entries(arabicMap)) {
    normalized = normalized.replace(new RegExp(from, 'g'), to);
  }
  
  return normalized;
}

/**
 * Remove headers and footers from document text
 * @param text - Document text
 * @returns Text with headers and footers removed
 */
function removeHeadersFooters(text: string): string {
  // Split into lines
  const lines = text.split('\n');
  
  // Remove common header/footer patterns
  const filteredLines = lines.filter(line => {
    // Remove lines that look like page numbers
    if (/^\s*\d+\s*$/.test(line)) return false;
    
    // Remove lines with common header/footer text
    const lowerLine = line.toLowerCase().trim();
    const headerFooterKeywords = [
      'page', 'صفحة', 'document', 'وثيقة', 'confidential', 'سري',
      'draft', 'مسودة', 'final', 'نهائي', 'revision', 'مراجعة'
    ];
    
    return !headerFooterKeywords.some(keyword => lowerLine.includes(keyword));
  });
  
  return filteredLines.join('\n');
}

/**
 * Enhance image quality (placeholder for future implementation)
 * @param imageBuffer - Image buffer
 * @returns Enhanced image buffer
 */
export async function enhanceImage(imageBuffer: Buffer): Promise<Buffer> {
  // This would integrate with image processing libraries like Sharp
  // For now, return the original buffer
  logger.warn('Image enhancement not implemented yet, returning original image');
  return imageBuffer;
}

export default {
  preprocessDocument,
  enhanceImage
};