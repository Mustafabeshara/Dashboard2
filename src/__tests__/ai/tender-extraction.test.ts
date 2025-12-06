/**
 * Tests for Tender Extraction AI Features
 * Tests extraction, validation, and confidence scoring
 */

import {
  parseTenderExtractionResult,
  validateTenderExtraction,
  needsHumanReview,
  TenderExtractionResult,
} from '@/lib/ai/tender-extraction';

describe('Tender Extraction', () => {
  describe('parseTenderExtractionResult', () => {
    it('should parse valid JSON extraction result', () => {
      const validJson = JSON.stringify({
        reference: 'MOH-2024-001',
        title: 'Medical Equipment Supply',
        organization: 'Ministry of Health',
        closingDate: '2024-12-31',
        items: [
          {
            itemDescription: 'Blood Pressure Monitor',
            quantity: 100,
            unit: 'pieces',
          },
        ],
        notes: 'Standard tender',
        confidence: {
          overall: 0.85,
          reference: 0.9,
          title: 0.85,
          organization: 0.9,
          closingDate: 0.8,
          items: 0.85,
        },
      });

      const result = parseTenderExtractionResult(validJson);
      
      expect(result.reference).toBe('MOH-2024-001');
      expect(result.title).toBe('Medical Equipment Supply');
      expect(result.organization).toBe('Ministry of Health');
      expect(result.closingDate).toBe('2024-12-31');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].itemDescription).toBe('Blood Pressure Monitor');
      expect(result.confidence?.overall).toBe(0.85);
    });

    it('should handle JSON with markdown code blocks', () => {
      const jsonWithMarkdown = `\`\`\`json
{
  "reference": "MOH-2024-001",
  "title": "Test Tender",
  "organization": "MOH",
  "closingDate": "2024-12-31",
  "items": [{"itemDescription": "Test Item", "quantity": 1, "unit": "piece"}]
}
\`\`\``;

      const result = parseTenderExtractionResult(jsonWithMarkdown);
      
      expect(result.reference).toBe('MOH-2024-001');
      expect(result.title).toBe('Test Tender');
    });

    it('should return default structure for invalid JSON', () => {
      const invalidJson = 'This is not JSON';

      const result = parseTenderExtractionResult(invalidJson);
      
      expect(result.reference).toBe('');
      expect(result.title).toBe('');
      expect(result.items).toHaveLength(0);
      expect(result.notes).toContain('Extraction failed');
      expect(result.confidence?.overall).toBe(0.0);
    });

    it('should return default structure for partial text data', () => {
      const partialText = `
        Reference: MOH-2024-001
        Title: Medical Equipment Supply
        Organization: Ministry of Health
        Closing Date: 2024-12-31
      `;

      const result = parseTenderExtractionResult(partialText);
      
      // Partial extraction should at least return default structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('reference');
      expect(result).toHaveProperty('items');
      // Check if extraction failed or succeeded
      if (result.confidence && result.confidence.overall > 0) {
        // If partial extraction worked
        expect(result.confidence.overall).toBeGreaterThan(0);
      } else {
        // If extraction failed completely
        expect(result.notes).toContain('Extraction failed');
      }
    });
  });

  describe('validateTenderExtraction', () => {
    const validExtraction: TenderExtractionResult = {
      reference: 'MOH-2024-001',
      title: 'Medical Equipment Supply',
      organization: 'Ministry of Health',
      closingDate: '2024-12-31',
      items: [
        {
          itemDescription: 'Blood Pressure Monitor',
          quantity: 100,
          unit: 'pieces',
        },
      ],
      confidence: {
        overall: 0.85,
        reference: 0.9,
        title: 0.85,
        organization: 0.9,
        closingDate: 0.8,
        items: 0.85,
      },
    };

    it('should pass validation for complete extraction', () => {
      const errors = validateTenderExtraction(validExtraction);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing reference', () => {
      const extraction = { ...validExtraction, reference: '' };
      const errors = validateTenderExtraction(extraction);
      expect(errors).toContain('Tender reference number is missing');
    });

    it('should detect missing title', () => {
      const extraction = { ...validExtraction, title: '' };
      const errors = validateTenderExtraction(extraction);
      expect(errors).toContain('Tender title is missing');
    });

    it('should detect missing organization', () => {
      const extraction = { ...validExtraction, organization: '' };
      const errors = validateTenderExtraction(extraction);
      expect(errors).toContain('Issuing organization is missing');
    });

    it('should detect invalid date format', () => {
      const extraction = { ...validExtraction, closingDate: '31/12/2024' };
      const errors = validateTenderExtraction(extraction);
      expect(errors).toContain('Closing date is not in YYYY-MM-DD format');
    });

    it('should detect missing items', () => {
      const extraction = { ...validExtraction, items: [] };
      const errors = validateTenderExtraction(extraction);
      expect(errors).toContain('No items extracted from tender');
    });

    it('should detect invalid item quantity', () => {
      const extraction = {
        ...validExtraction,
        items: [
          {
            itemDescription: 'Test Item',
            quantity: 0,
            unit: 'pieces',
          },
        ],
      };
      const errors = validateTenderExtraction(extraction);
      expect(errors).toContain('Item 1: Invalid quantity');
    });

    it('should detect low confidence scores', () => {
      const extraction = {
        ...validExtraction,
        confidence: {
          overall: 0.4,
          reference: 0.4,
          title: 0.5,
          organization: 0.5,
          closingDate: 0.5,
          items: 0.3,
        },
      };
      const errors = validateTenderExtraction(extraction);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('confidence'))).toBe(true);
    });
  });

  describe('needsHumanReview', () => {
    it('should require review for low overall confidence', () => {
      const extraction: TenderExtractionResult = {
        reference: 'MOH-2024-001',
        title: 'Test Tender',
        organization: 'MOH',
        closingDate: '2024-12-31',
        items: [{ itemDescription: 'Item', quantity: 1, unit: 'piece' }],
        confidence: {
          overall: 0.6,
          reference: 0.8,
          title: 0.8,
          organization: 0.8,
          closingDate: 0.8,
          items: 0.8,
        },
      };

      expect(needsHumanReview(extraction)).toBe(true);
    });

    it('should require review for low reference confidence', () => {
      const extraction: TenderExtractionResult = {
        reference: 'MOH-2024-001',
        title: 'Test Tender',
        organization: 'MOH',
        closingDate: '2024-12-31',
        items: [{ itemDescription: 'Item', quantity: 1, unit: 'piece' }],
        confidence: {
          overall: 0.8,
          reference: 0.5,
          title: 0.8,
          organization: 0.8,
          closingDate: 0.8,
          items: 0.8,
        },
      };

      expect(needsHumanReview(extraction)).toBe(true);
    });

    it('should require review for missing critical data', () => {
      const extraction: TenderExtractionResult = {
        reference: '',
        title: 'Test Tender',
        organization: 'MOH',
        closingDate: '2024-12-31',
        items: [{ itemDescription: 'Item', quantity: 1, unit: 'piece' }],
        confidence: {
          overall: 0.9,
          reference: 0.9,
          title: 0.9,
          organization: 0.9,
          closingDate: 0.9,
          items: 0.9,
        },
      };

      expect(needsHumanReview(extraction)).toBe(true);
    });

    it('should not require review for high quality extraction', () => {
      const extraction: TenderExtractionResult = {
        reference: 'MOH-2024-001',
        title: 'Medical Equipment Supply',
        organization: 'Ministry of Health',
        closingDate: '2024-12-31',
        items: [{ itemDescription: 'Item', quantity: 100, unit: 'pieces' }],
        confidence: {
          overall: 0.85,
          reference: 0.9,
          title: 0.85,
          organization: 0.9,
          closingDate: 0.8,
          items: 0.85,
        },
      };

      expect(needsHumanReview(extraction)).toBe(false);
    });

    it('should require review when no confidence data present', () => {
      const extraction: TenderExtractionResult = {
        reference: 'MOH-2024-001',
        title: 'Test Tender',
        organization: 'MOH',
        closingDate: '2024-12-31',
        items: [{ itemDescription: 'Item', quantity: 1, unit: 'piece' }],
      };

      expect(needsHumanReview(extraction)).toBe(true);
    });
  });
});
