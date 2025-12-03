/**
 * Tender Extraction Validation with Zod
 * Provides robust validation for extracted tender data
 */

import { z } from 'zod';

// Schema for individual tender items (AI extraction) - Bilingual support
export const tenderItemSchema = z.object({
  itemDescription: z
    .string()
    .min(1, 'Item description is required')
    .max(1000, 'Item description must be less than 1000 characters'), // Increased for bilingual descriptions
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit must be less than 50 characters'), // Increased for bilingual units like "صندوق/Box"
  specifications: z.string().max(1000).optional(), // Optional specs field
});

// Schema for tender item in database (with participation flag)
export const tenderItemDatabaseSchema = z.object({
  itemNumber: z.number().int().positive(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unit: z.string().min(1, 'Unit is required').max(20, 'Unit must be less than 20 characters'),
  specifications: z.string().optional(),
  isParticipating: z.boolean().default(true),
  estimatedPrice: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

// Schema for confidence scores
export const confidenceSchema = z
  .object({
    overall: z.number().min(0).max(1),
    reference: z.number().min(0).max(1),
    title: z.number().min(0).max(1),
    organization: z.number().min(0).max(1),
    closingDate: z.number().min(0).max(1),
    items: z.number().min(0).max(1),
  })
  .optional();

// Schema for tender extraction result (with bilingual support)
export const tenderExtractionSchema = z.object({
  reference: z
    .string()
    .min(1, 'Tender reference is required')
    .max(50, 'Reference must be less than 50 characters'),
  title: z
    .string()
    .min(1, 'Tender title is required')
    .max(500, 'Title must be less than 500 characters'), // Increased for bilingual titles
  organization: z
    .string()
    .min(1, 'Organization is required')
    .max(300, 'Organization must be less than 300 characters'), // Increased for bilingual org names
  closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Closing date must be in YYYY-MM-DD format'),
  items: z.array(tenderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().default(''), // Increased for bilingual notes
  language: z.enum(['ar', 'en', 'ar-en']).optional().default('en'), // Language detection
  confidence: confidenceSchema,
});

// Type inference from schema
export type TenderItem = z.infer<typeof tenderItemSchema>;
export type ConfidenceScores = z.infer<typeof confidenceSchema>;
export type TenderExtraction = z.infer<typeof tenderExtractionSchema>;

/**
 * Validate tender extraction result
 * @param data - Extracted tender data
 * @returns Validation result with success status and errors if any
 */
export function validateTenderExtractionWithZod(data: any): {
  success: boolean;
  errors?: z.ZodError<TenderExtraction>;
  data?: TenderExtraction;
} {
  try {
    const result = tenderExtractionSchema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: result.error,
      };
    }
  } catch (error) {
    console.error('Zod validation error:', error);
    return {
      success: false,
      errors: error as z.ZodError<TenderExtraction>,
    };
  }
}

/**
 * Sanitize and normalize tender extraction data
 * @param data - Raw extracted data
 * @returns Sanitized data
 */
export function sanitizeTenderExtraction(data: any): Partial<TenderExtraction> {
  const sanitized: Partial<TenderExtraction> = {};

  // Sanitize reference
  if (data.reference && typeof data.reference === 'string') {
    sanitized.reference = data.reference.trim().substring(0, 50);
  }

  // Sanitize title
  if (data.title && typeof data.title === 'string') {
    sanitized.title = data.title.trim().substring(0, 200);
  }

  // Sanitize organization
  if (data.organization && typeof data.organization === 'string') {
    sanitized.organization = data.organization.trim().substring(0, 100);
  }

  // Sanitize closing date (ensure proper format)
  if (data.closingDate && typeof data.closingDate === 'string') {
    // Try to parse and reformat the date
    const dateStr = data.closingDate.trim();

    // Check if it's already in the correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      sanitized.closingDate = dateStr;
    } else {
      // Try to parse different date formats
      let date: Date | null = null;

      // Try common formats
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(dateStr)) {
        // MM/DD/YYYY or MM-DD-YYYY
        const parts = dateStr.split(/[\/\-]/);
        date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else if (/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(dateStr)) {
        // YYYY/MM/DD or YYYY-MM-DD
        const parts = dateStr.split(/[\/\-]/);
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }

      if (date && !isNaN(date.getTime())) {
        sanitized.closingDate = date.toISOString().split('T')[0];
      }
    }
  }

  // Sanitize items
  if (Array.isArray(data.items)) {
    sanitized.items = data.items
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        itemDescription:
          typeof item.itemDescription === 'string'
            ? item.itemDescription.trim().substring(0, 500)
            : typeof item.description === 'string'
            ? item.description.trim().substring(0, 500)
            : '',
        quantity:
          typeof item.quantity === 'number'
            ? Math.max(1, Math.floor(item.quantity))
            : typeof item.quantity === 'string'
            ? Math.max(1, Math.floor(parseFloat(item.quantity)) || 1)
            : 1,
        unit: typeof item.unit === 'string' ? item.unit.trim().substring(0, 20) : 'pcs',
      }))
      .filter((item: any) => item.itemDescription.length > 0);
  }

  // Sanitize notes
  if (data.notes && typeof data.notes === 'string') {
    sanitized.notes = data.notes.trim().substring(0, 1000);
  }

  // Handle confidence scores
  if (data.confidence && typeof data.confidence === 'object') {
    const conf = data.confidence;
    sanitized.confidence = {
      overall: typeof conf.overall === 'number' ? Math.min(1, Math.max(0, conf.overall)) : 0.5,
      reference:
        typeof conf.reference === 'number' ? Math.min(1, Math.max(0, conf.reference)) : 0.5,
      title: typeof conf.title === 'number' ? Math.min(1, Math.max(0, conf.title)) : 0.5,
      organization:
        typeof conf.organization === 'number' ? Math.min(1, Math.max(0, conf.organization)) : 0.5,
      closingDate:
        typeof conf.closingDate === 'number' ? Math.min(1, Math.max(0, conf.closingDate)) : 0.5,
      items: typeof conf.items === 'number' ? Math.min(1, Math.max(0, conf.items)) : 0.5,
    };
  }

  return sanitized;
}

export default {
  tenderItemSchema,
  confidenceSchema,
  tenderExtractionSchema,
  validateTenderExtractionWithZod,
  sanitizeTenderExtraction,
};
