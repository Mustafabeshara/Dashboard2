/**
 * Tender Extraction Utilities
 * Ported from Dashboard with enhancements
 */

import { invokeUnifiedLLM, LLMProvider, getRecommendedProvider } from './llm-provider';
import { TENDER_EXTRACTION_PROMPT, TENDER_EXTRACTION_SYSTEM_PROMPT } from './config';
import { validateTenderExtractionWithZod, sanitizeTenderExtraction } from './tender-validation';
import { sanitizePromptInput, validateAIResponse } from './prompt-sanitizer';

export interface TenderExtractionResult {
  reference: string;
  title: string;
  organization: string;
  closingDate: string;
  items: Array<{
    itemDescription: string;
    quantity: number;
    unit: string;
  }>;
  notes?: string;
  confidence?: {
    overall: number;
    reference: number;
    title: number;
    organization: number;
    closingDate: number;
    items: number;
  };
}

/**
 * Parse and validate extracted tender data
 */
export function parseTenderExtractionResult(extractedText: string): TenderExtractionResult {
  // Clean markdown formatting if present
  const cleanedText = extractedText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsedData = JSON.parse(cleanedText);
    
    // Sanitize the data first
    const sanitizedData = sanitizeTenderExtraction(parsedData);
    
    // Validate with Zod
    const validation = validateTenderExtractionWithZod(sanitizedData);
    
    if (validation.success && validation.data) {
      return validation.data;
    } else {
      // Try to extract partial data using regex patterns as fallback
      const partialData = extractPartialData(cleanedText);

      if (partialData) {
        // Validate the partial data as well
        const partialValidation = validateTenderExtractionWithZod(partialData);
        if (partialValidation.success && partialValidation.data) {
          return partialValidation.data;
        }
      }
    }

    // Return with default values if validation fails
    return {
      reference: '',
      title: '',
      organization: '',
      closingDate: '',
      items: [],
      notes: 'Extraction failed. Please enter data manually.',
      confidence: {
        overall: 0.0,
        reference: 0.0,
        title: 0.0,
        organization: 0.0,
        closingDate: 0.0,
        items: 0.0,
      },
    };
  } catch (e) {
    // Don't log potentially sensitive extracted text
    console.error('JSON parsing error:', e instanceof Error ? e.message : 'Parse failed');
    console.error('Extracted text length:', cleanedText.length);
    
    // Try to extract partial data using regex patterns
    const partialData = extractPartialData(cleanedText);
    
    if (partialData) {
      // Validate the partial data
      const partialValidation = validateTenderExtractionWithZod(partialData);
      if (partialValidation.success && partialValidation.data) {
        return partialValidation.data;
      }
    }

    return {
      reference: '',
      title: '',
      organization: '',
      closingDate: '',
      items: [],
      notes: 'Extraction failed. Please enter data manually.',
      confidence: {
        overall: 0.0,
        reference: 0.0,
        title: 0.0,
        organization: 0.0,
        closingDate: 0.0,
        items: 0.0,
      },
    };
  }
}

/**
 * Extract partial data from malformed JSON using regex patterns
 * @param text - Text that failed JSON parsing
 * @returns Partially extracted data or null
 */
function extractPartialData(text: string): TenderExtractionResult | null {
  try {
    const result: TenderExtractionResult = {
      reference: '',
      title: '',
      organization: '',
      closingDate: '',
      items: [],
      notes: '',
      confidence: {
        overall: 0.3, // Lower confidence for partial extraction
        reference: 0.0,
        title: 0.0,
        organization: 0.0,
        closingDate: 0.0,
        items: 0.0,
      },
    };
    
    // Extract reference number
    const refMatch = text.match(/(?:reference|رقم\s*الملف|file\s*no)[:\s]*([A-Z0-9\-_]+)/i);
    if (refMatch && result.confidence) {
      result.reference = refMatch[1];
      result.confidence.reference = 0.7;
    }
    
    // Extract title
    const titleMatch = text.match(/(?:title|subject|الموضوع)[:\s]*([^\n\r]+)/i);
    if (titleMatch && result.confidence) {
      result.title = titleMatch[1].trim();
      result.confidence.title = 0.7;
    }
    
    // Extract organization
    const orgMatch = text.match(/(?:organization|issuer|الجهة)[:\s]*([^\n\r]+)/i);
    if (orgMatch && result.confidence) {
      result.organization = orgMatch[1].trim();
      result.confidence.organization = 0.7;
    }
    
    // Extract closing date
    const dateMatch = text.match(/(?:closing\s*date|deadline|الموعد)[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})/i);
    if (dateMatch && result.confidence) {
      result.closingDate = dateMatch[1];
      result.confidence.closingDate = 0.7;
    }
    
    // Update overall confidence based on extracted fields
    if (result.confidence) {
      const extractedFields = [
        result.confidence.reference,
        result.confidence.title,
        result.confidence.organization,
        result.confidence.closingDate
      ].filter(conf => conf > 0).length;
      
      result.confidence.overall = Math.min(0.3 + (extractedFields * 0.15), 0.9);
      
      return result.confidence.overall > 0.3 ? result : null;
    }
    
    return null;
  } catch (error) {
    console.error('Partial data extraction failed:', error);
    return null;
  }
}

/**
 * Check if Gemini is properly configured
 */
async function isGeminiConfigured(): Promise<boolean> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!geminiKey) return false;

  // Check if it's a placeholder key
  const placeholderPatterns = ['your-', '-key', 'placeholder', 'changeme', 'example', 'xxx', 'test-', 'dummy'];
  return !placeholderPatterns.some(p => geminiKey.toLowerCase().includes(p.toLowerCase())) && geminiKey.length > 20;
}

/**
 * Extract tender data from document
 * @param fileUrl - Public URL of the document (PDF or image)
 * @param mimeType - MIME type of the document
 * @returns Extracted tender data with confidence scores
 */
export async function extractTenderFromDocument(
  fileUrl: string,
  mimeType: string
): Promise<TenderExtractionResult> {
  const isPdf = mimeType === 'application/pdf';
  const geminiAvailable = await isGeminiConfigured();

  // If it's a PDF and Gemini is not available, we need to extract text first
  // since Groq doesn't support file_url
  if (isPdf && !geminiAvailable) {
    console.log('[ExtractTender] Gemini not configured, using text extraction + Groq for PDF');
    // The caller should have already extracted text and called extractTenderFromText
    // If we get here, it means they're trying to use document extraction without Gemini
    throw new Error('PDF document extraction requires either: (1) GEMINI_API_KEY configured, or (2) text extraction before calling this function. Please extract text from the PDF first and use extractTenderFromText().');
  }

  // Determine content type based on mime type
  const contentPart = isPdf
    ? {
        type: 'file_url' as const,
        file_url: { url: fileUrl, mime_type: 'application/pdf' as const },
      }
    : { type: 'image_url' as const, image_url: { url: fileUrl } };

  // Determine recommended provider based on file type (now async)
  const provider = isPdf ? LLMProvider.GEMINI : await getRecommendedProvider('image');

  // Retry mechanism
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await invokeUnifiedLLM(
        {
          messages: [
            { role: 'system', content: TENDER_EXTRACTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [{ type: 'text', text: TENDER_EXTRACTION_PROMPT }, contentPart],
            },
          ],
        },
        { provider }
      );

      // Validate response structure
      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Invalid LLM response: no choices returned');
      }

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('No content extracted from document');
      }

      const extractedText = typeof rawContent === 'string' ? rawContent : '{}';
      const parsedData = parseTenderExtractionResult(extractedText);

      // If we got a result with very low confidence, retry with a different provider
      if (parsedData.confidence?.overall && parsedData.confidence.overall < 0.3 && attempt < 3) {
        lastError = new Error('Low confidence extraction result');
        continue;
      }

      return parsedData;
    } catch (llmError: unknown) {
      const errorMessage = llmError instanceof Error ? llmError.message : 'Unknown error';
      console.error(`[ExtractTender] LLM invocation failed on attempt ${attempt}:`, errorMessage);
      lastError = llmError instanceof Error ? llmError : new Error(errorMessage);

      // Don't retry on validation errors
      if (errorMessage.includes('Invalid LLM response') || errorMessage.includes('No content')) {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`LLM extraction failed after 3 attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Extract tender data from text content
 * @param text - Text content to extract tender data from
 * @returns Extracted tender data with confidence scores
 */
export async function extractTenderFromText(
  text: string
): Promise<TenderExtractionResult> {
  // Sanitize and truncate text to prevent prompt injection
  const maxLength = 100000; // Adjust based on model limits
  const sanitizedText = sanitizePromptInput(text, { maxLength, allowNewlines: true, stripHtml: true });
  const truncatedText = sanitizedText.length > maxLength ? sanitizedText.substring(0, maxLength) + '\n... [truncated]' : sanitizedText;

  // Retry mechanism
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await invokeUnifiedLLM(
        {
          messages: [
            { role: 'system', content: TENDER_EXTRACTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: TENDER_EXTRACTION_PROMPT },
                { type: 'text', text: `Extract tender information from the following text:\n\n${truncatedText}` }
              ],
            },
          ],
        }
      );

      // Validate response structure
      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Invalid LLM response: no choices returned');
      }

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('No content extracted from document');
      }

      const extractedText = typeof rawContent === 'string' ? rawContent : '{}';
      const parsedData = parseTenderExtractionResult(extractedText);

      // If we got a result with very low confidence, retry
      if (parsedData.confidence?.overall && parsedData.confidence.overall < 0.3 && attempt < 3) {
        lastError = new Error('Low confidence extraction result');
        continue;
      }

      return parsedData;
    } catch (llmError: unknown) {
      const errorMsg = llmError instanceof Error ? llmError.message : 'Unknown error';
      console.error(`[ExtractTenderText] LLM invocation failed on attempt ${attempt}:`, errorMsg);
      lastError = llmError instanceof Error ? llmError : new Error(errorMsg);

      // Don't retry on validation errors
      if (errorMsg.includes('Invalid LLM response') || errorMsg.includes('No content')) {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`LLM text extraction failed after 3 attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Validate tender extraction result
 * @param data - Extracted tender data
 * @returns Validation errors (empty array if valid)
 */
export function validateTenderExtraction(data: TenderExtractionResult): string[] {
  const errors: string[] = [];

  if (!data.reference || data.reference.trim() === '') {
    errors.push('Tender reference number is missing');
  }

  if (!data.title || data.title.trim() === '') {
    errors.push('Tender title is missing');
  }

  if (!data.organization || data.organization.trim() === '') {
    errors.push('Issuing organization is missing');
  }

  if (!data.closingDate || data.closingDate.trim() === '') {
    errors.push('Closing date is missing');
  } else {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.closingDate)) {
      errors.push('Closing date is not in YYYY-MM-DD format');
    }
  }

  if (!data.items || data.items.length === 0) {
    errors.push('No items extracted from tender');
  } else {
    // Validate each item
    data.items.forEach((item, index) => {
      if (!item.itemDescription || item.itemDescription.trim() === '') {
        errors.push(`Item ${index + 1}: Description is missing`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Invalid quantity`);
      }
      if (!item.unit || item.unit.trim() === '') {
        errors.push(`Item ${index + 1}: Unit is missing`);
      }
    });
  }

  // Check confidence scores
  if (data.confidence) {
    if (data.confidence.overall < 0.5) {
      errors.push('Overall extraction confidence is low (< 50%)');
    }
    if (data.confidence.reference < 0.5) {
      errors.push('Reference number extraction confidence is low');
    }
    if (data.confidence.items < 0.5) {
      errors.push('Items extraction confidence is low');
    }
  }

  return errors;
}

/**
 * Check if extraction needs human review
 * @param data - Extracted tender data
 * @returns true if human review is recommended
 */
export function needsHumanReview(data: TenderExtractionResult): boolean {
  // No confidence data - needs review
  if (!data.confidence) {
    return true;
  }

  // Overall confidence too low
  if (data.confidence.overall < 0.7) {
    return true;
  }

  // Critical fields have low confidence
  if (
    data.confidence.reference < 0.7 ||
    data.confidence.closingDate < 0.7 ||
    data.confidence.items < 0.6
  ) {
    return true;
  }

  // Missing critical data
  if (
    !data.reference ||
    !data.title ||
    !data.organization ||
    !data.closingDate ||
    data.items.length === 0
  ) {
    return true;
  }

  return false;
}
