
The document may contain:
- Mixed Arabic and English text
- Tables with multiple columns
- Scanned or photographed content
- Headers, footers, and logos

Your task: Extract structured data and return ONLY valid JSON (no markdown, no explanations).

Required JSON structure:
{
  "reference": "tender reference number",
  "title": "tender title/subject",
  "organization": "issuing organization name",
  "closingDate": "YYYY-MM-DD",
  "items": [
    {
      "itemDescription": "full item description",
      "quantity": number,
      "unit": "unit of measurement"
    }
  ],
  "notes": "additional requirements or instructions",
  "confidence": {
    "overall": 0.0-1.0,
    "reference": 0.0-1.0,
    "title": 0.0-1.0,
    "organization": 0.0-1.0,
    "closingDate": 0.0-1.0,
    "items": 0.0-1.0
  }
}

Extraction Rules:

1. REFERENCE NUMBER:
   - Look for: "ملف رقم", "File No", "Tender No", "RFQ", "إستدراج عروض لملف رقم"
   - Example: "5SSN11" from "إستدراج عروض لملف رقم: 5SSN11"

2. TITLE:
   - Extract the main subject line (Arabic or English)
   - Example: "شراء لوازم طبية مستهلكات" or "Medical Disposables Purchase"

3. ORGANIZATION:
   - Look for: "وزارة الصحة", "Ministry of Health", "إدارة المستودعات الطبية", "MEDICAL STORE ADMINISTRATION"
   - Include both ministry and department if present
   - Example: "Ministry of Health - Medical Store Administration"

4. CLOSING DATE:
   - Look for: "CLOSING DATE", "تاريخ الإغلاق", "BEFORE"
   - Convert to YYYY-MM-DD format
   - Examples: "26/11/2025" → "2025-11-26", "26-11-2025" → "2025-11-26"

5. ITEMS TABLE:
   - Identify table with columns: SL No / ITEM DESCRIPTION / UNIT / QUANTITY
   - Extract EVERY row from the table
   - For item description: Include full text exactly as written, preserve technical terms
   - For quantity: Extract numeric value only
     * "600" → 600
     * "Six Hundred Only" → 600
     * "1,000" → 1000
   - For unit: Extract as written (PCS, boxes, units, etc.)

6. NOTES:
   - Extract special requirements, instructions, or conditions
   - Look for sections about: samples, certificates, delivery, documentation
   - Include any important footnotes or asterisk notes

OCR Tips:
- Read text carefully, including small print and footnotes
- Preserve exact spelling of medical/technical terms
- Handle both clear and low-quality scans
- Recognize table structures even if lines are faint
- Process multi-column layouts correctly

7. CONFIDENCE SCORES:
   - Rate extraction confidence for each field (0.0 = uncertain, 1.0 = certain)
   - Base confidence on:
     * Text clarity and readability
     * Presence of expected keywords/patterns
     * Completeness of extracted data
   - overall: Average of all field confidences
   - Lower confidence if:
     * Text is blurry or partially obscured
     * Expected patterns not found
     * Had to make assumptions

Return ONLY the JSON object. No markdown code blocks, no explanations.`;

export const TENDER_EXTRACTION_SYSTEM_PROMPT =
  "You are an expert OCR and document extraction system specialized in medical tender documents. You excel at reading tables, mixed-language text (Arabic/English), and extracting structured data with high accuracy. Always return valid JSON without markdown formatting.";

// Parse and validate extracted tender data
export function parseTenderExtractionResult(extractedText: string): {
  reference: string;
  title: string;
  organization: string;
  closingDate: string;
  items: Array<{ itemDescription: string; quantity: number; unit: string }>;
  notes: string;
  confidence?: {
    overall: number;
    reference: number;
    title: number;
    organization: number;
    closingDate: number;
    items: number;
  };
} {
  // Clean markdown formatting if present
  const cleanedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsedData = JSON.parse(cleanedText);

    // Validate and provide defaults for required fields
    return {
      reference: parsedData.reference || "",
      title: parsedData.title || "",
      organization: parsedData.organization || "",
      closingDate: parsedData.closingDate || "",
      items: Array.isArray(parsedData.items)
        ? parsedData.items.map((item: any) => ({
            itemDescription: item.itemDescription || item.description || "",
            quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 1,
            unit: item.unit || "pcs"
          }))
        : [],
      notes: parsedData.notes || "",
      confidence: parsedData.confidence || {
        overall: 0.5,
        reference: 0.5,
        title: 0.5,
        organization: 0.5,
        closingDate: 0.5,
        items: 0.5
      }
    };
  } catch (e) {
    console.error("JSON parsing error:", e);
    console.error("Raw extracted text:", cleanedText);

    return {
      reference: "",
      title: "",
      organization: "",
      closingDate: "",
      items: [],
      notes: "Extraction failed. Please enter data manually."
    };
  }
}


// Invoice extraction prompt
export const INVOICE_EXTRACTION_PROMPT = `You are an expert document OCR and data extraction system. Carefully analyze this invoice document image/PDF.

The document may contain:
- Mixed Arabic and English text
- Tables with line items
- Vendor and customer information
- Payment terms and totals