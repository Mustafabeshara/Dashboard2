/**
 * Tender Extraction Utilities
 * Ported from Dashboard with enhancements
 */

import { invokeUnifiedLLM, LLMProvider, getRecommendedProvider } from './llm-provider';
import { TENDER_EXTRACTION_PROMPT, TENDER_EXTRACTION_SYSTEM_PROMPT } from './config';

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
  notes: string;
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

    // Validate and provide defaults for required fields
    return {
      reference: parsedData.reference || '',
      title: parsedData.title || '',
      organization: parsedData.organization || '',
      closingDate: parsedData.closingDate || '',
      items: Array.isArray(parsedData.items)
        ? parsedData.items.map((item: any) => ({
            itemDescription: item.itemDescription || item.description || '',
            quantity:
              typeof item.quantity === 'number'
                ? item.quantity
                : parseInt(item.quantity) || 1,
            unit: item.unit || 'pcs',
          }))
        : [],
      notes: parsedData.notes || '',
      confidence: parsedData.confidence || {
        overall: 0.5,
        reference: 0.5,
        title: 0.5,
        organization: 0.5,
        closingDate: 0.5,
        items: 0.5,
      },
    };
  } catch (e) {
    console.error('JSON parsing error:', e);
    console.error('Raw extracted text:', cleanedText);

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
 * Extract tender data from document
 * @param fileUrl - Public URL of the document (PDF or image)
 * @param mimeType - MIME type of the document
 * @returns Extracted tender data with confidence scores
 */
export async function extractTenderFromDocument(
  fileUrl: string,
  mimeType: string
): Promise<TenderExtractionResult> {
  console.log(`[ExtractTender] Processing document, URL: ${fileUrl}, mimeType: ${mimeType}`);

  // Determine content type based on mime type
  const isPdf = mimeType === 'application/pdf';
  const contentPart = isPdf
    ? {
        type: 'file_url' as const,
        file_url: { url: fileUrl, mime_type: 'application/pdf' as const },
      }
    : { type: 'image_url' as const, image_url: { url: fileUrl } };

  // Determine recommended provider based on file type
  const provider = isPdf ? LLMProvider.GEMINI : getRecommendedProvider('image');
  console.log(`[ExtractTender] Using provider: ${provider}`);

  let response;
  try {
    response = await invokeUnifiedLLM(
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
  } catch (llmError: any) {
    console.error(`[ExtractTender] LLM invocation failed:`, llmError);
    throw new Error(`LLM extraction failed: ${llmError.message || 'Unknown LLM error'}`);
  }

  // Validate response structure
  if (!response || !response.choices || response.choices.length === 0) {
    console.error(`[ExtractTender] Invalid LLM response structure:`, JSON.stringify(response));
    throw new Error('Invalid LLM response: no choices returned');
  }

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    console.error(`[ExtractTender] No content in LLM response`);
    throw new Error('No content extracted from document');
  }

  const extractedText = typeof rawContent === 'string' ? rawContent : '{}';
  console.log(`[ExtractTender] Raw extracted text length: ${extractedText.length}`);

  let parsedData;
  try {
    parsedData = parseTenderExtractionResult(extractedText);
  } catch (parseError: any) {
    console.error(`[ExtractTender] Parse error:`, parseError);
    throw new Error(`Failed to parse extracted data: ${parseError.message}`);
  }

  console.log(`[ExtractTender] Successfully processed document`);
  return parsedData;
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
