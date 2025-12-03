/**
 * AI Service Configuration
 * Defines API keys, rate limits, and provider settings for the AI fallback chain
 */

export interface AIProviderConfig {
  name: string;
  apiKey: string | undefined;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  rateLimitPerDay: number;
  rateLimitPerMinute: number;
  priority: number; // Lower = higher priority
  isEnabled: boolean;
  supportsVision: boolean;
  supportsArabic: boolean;
}

export interface AIServiceConfig {
  providers: AIProviderConfig[];
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}

// Provider configurations
export const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  groq: {
    name: 'Groq',
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-70b-versatile',
    maxTokens: 8192,
    temperature: 0.1,
    rateLimitPerDay: 14400,
    rateLimitPerMinute: 30,
    priority: 1, // Primary - fastest
    isEnabled: !!process.env.GROQ_API_KEY,
    supportsVision: false,
    supportsArabic: true,
  },
  gemini: {
    name: 'Gemini',
    apiKey: process.env.GEMINI_API_KEY,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    maxTokens: 8192,
    temperature: 0.1,
    rateLimitPerDay: 1500,
    rateLimitPerMinute: 15,
    priority: 2, // Secondary
    isEnabled: !!process.env.GEMINI_API_KEY,
    supportsVision: true,
    supportsArabic: true,
  },
  googleAI: {
    name: 'Google AI Studio',
    apiKey: process.env.GOOGLE_AI_API_KEY,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    maxTokens: 8192,
    temperature: 0.1,
    rateLimitPerDay: 1000,
    rateLimitPerMinute: 10,
    priority: 3, // Tertiary
    isEnabled: !!process.env.GOOGLE_AI_API_KEY,
    supportsVision: true,
    supportsArabic: true,
  },
  anthropic: {
    name: 'Claude (Anthropic)',
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
    maxTokens: 4096,
    temperature: 0.1,
    rateLimitPerDay: 500,
    rateLimitPerMinute: 5,
    priority: 4, // Last resort
    isEnabled: !!process.env.ANTHROPIC_API_KEY,
    supportsVision: true,
    supportsArabic: true,
  },
};

// Provider cost per 1K tokens (approximate in USD)
export const PROVIDER_COSTS: Record<string, { prompt: number; completion: number }> = {
  groq: { prompt: 0.0001, completion: 0.0001 },
  gemini: { prompt: 0.00025, completion: 0.0005 },
  googleAI: { prompt: 0.0005, completion: 0.0015 },
  anthropic: { prompt: 0.00025, completion: 0.00125 },
};

// Main configuration
export const AI_CONFIG: AIServiceConfig = {
  providers: Object.values(AI_PROVIDERS)
    .filter(p => p.isEnabled)
    .sort((a, b) => a.priority - b.priority),
  defaultTimeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour
};

/**
 * Validate AI provider API keys
 */
export function validateAIProviders(): { valid: string[]; invalid: string[] } {
  const results = { valid: [] as string[], invalid: [] as string[] };

  for (const [name, config] of Object.entries(AI_PROVIDERS)) {
    if (config.isEnabled && config.apiKey) {
      results.valid.push(name);
    } else if (config.isEnabled && !config.apiKey) {
      results.invalid.push(name);
    }
  }

  return results;
}

/**
 * Calculate estimated cost for AI request
 */
export function estimateAICost(
  provider: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = PROVIDER_COSTS[provider];
  if (!costs) return 0;

  return (promptTokens / 1000) * costs.prompt + (completionTokens / 1000) * costs.completion;
}

// Task-specific model recommendations
export const TASK_MODELS = {
  // Document extraction - needs accuracy
  documentExtraction: ['gemini', 'googleAI', 'anthropic'],
  // Quick summaries - speed prioritized
  summarization: ['groq', 'gemini'],
  // Arabic text processing
  arabicProcessing: ['gemini', 'googleAI', 'groq'],
  // Vision tasks (OCR, image analysis)
  vision: ['gemini', 'googleAI', 'anthropic'],
  // Complex analysis
  complexAnalysis: ['googleAI', 'anthropic', 'gemini'],
};

// Enhanced tender extraction prompt from Dashboard (proven with real MOH documents)
// Bilingual system supporting both Arabic and English tender documents
export const TENDER_EXTRACTION_SYSTEM_PROMPT =
  'You are a bilingual expert OCR and document extraction system specialized in medical tender documents from Kuwait and the Middle East. You excel at reading and processing documents in both Arabic (العربية) and English, including: bidirectional text (RTL/LTR), mixed-language tables, Arabic diacritics, Arabic and Western numerals, and complex multi-column bilingual layouts. You extract structured data with high accuracy from both clear and low-quality scans. Always return valid JSON without markdown formatting.';

export const TENDER_EXTRACTION_PROMPT = `You are a bilingual expert document OCR and data extraction system. Carefully analyze this tender document image/PDF.

🌍 BILINGUAL PROCESSING: This system handles documents in BOTH Arabic (العربية) and English.
Many Kuwait government tender documents are bilingual with Arabic on the right and English on the left.

The document may contain:
- Mixed Arabic and English text (bidirectional RTL/LTR)
- Bilingual tables with multiple columns
- Arabic diacritics (تشكيل) and special characters
- Arabic numerals (٠١٢٣٤٥٦٧٨٩) and Western numerals (0123456789)
- Scanned or photographed content (may be low quality)
- Headers, footers, logos, and watermarks
- Government seals and stamps

Your task: Extract structured data and return ONLY valid JSON (no markdown, no explanations).

Required JSON structure:
{
  "reference": "tender reference number",
  "title": "tender title/subject (preserve original language)",
  "organization": "issuing organization name (bilingual if available)",
  "closingDate": "YYYY-MM-DD",
  "items": [
    {
      "itemDescription": "full item description (preserve original language)",
      "quantity": number,
      "unit": "unit of measurement (preserve original language)",
      "specifications": "detailed specs if available"
    }
  ],
  "notes": "additional requirements or instructions (bilingual if available)",
  "language": "ar | en | ar-en",
  "confidence": {
    "overall": 0.0-1.0,
    "reference": 0.0-1.0,
    "title": 0.0-1.0,
    "organization": 0.0-1.0,
    "closingDate": 0.0-1.0,
    "items": 0.0-1.0
  }
}

Extraction Rules (مرجع القواعد):

1. REFERENCE NUMBER / رقم المرجع (CRITICAL):
   - Look for keywords in BOTH languages:
     * Arabic: "ملف رقم", "رقم الملف", "إستدراج عروض لملف رقم", "مناقصة رقم", "رقم المناقصة", "م.ع.ر"
     * English: "File No", "File No.", "Tender No", "Tender No.", "RFQ", "Reference No", "Ref:", "Ref. No."
   - Extract ONLY alphanumeric code following keywords
   - Bilingual examples (أمثلة):
     * "إستدراج عروض لملف رقم: 5SSN11" → "5SSN11"
     * "File No: MOH-2025-123" → "MOH-2025-123"
     * "Tender No. T-456/2025" → "T-456/2025"
     * "ملف رقم 789ABC" → "789ABC"
     * "م.ع.ر رقم 1234/2025" → "1234/2025"
   - DO NOT include punctuation (:, ., etc.)
   - DO NOT extract dates as reference
   - If same reference in both languages, extract once

2. TITLE / العنوان:
   - Extract main subject in original language(s)
   - Bilingual docs may include both: "شراء أجهزة طبية / Medical Equipment Purchase"
   - Preserve technical/medical terms exactly

3. ORGANIZATION / الجهة المصدرة:
   - Look for in BOTH languages:
     * Arabic: "وزارة الصحة", "إدارة المستودعات الطبية", "إدارة العقود", "إدارة المشتريات"
     * English: "Ministry of Health", "MOH", "MEDICAL STORE ADMINISTRATION", "Contracts Department"
   - Include ministry + department if present
   - Example: "وزارة الصحة - إدارة المستودعات / Ministry of Health - Medical Store"

4. CLOSING DATE / تاريخ الإغلاق:
   - Look for in BOTH languages:
     * Arabic: "تاريخ الإغلاق", "آخر موعد", "ينتهي في", "قبل"
     * English: "CLOSING DATE", "DEADLINE", "BEFORE", "LAST DATE"
   - Convert to YYYY-MM-DD format
   - Handle: "26/11/2025", "26-11-2025", "٢٦/١١/٢٠٢٥", "November 26, 2025" → "2025-11-26"

5. ITEMS TABLE / جدول الأصناف (EXTRACT EVERY ROW):
   - Identify table headers in Arabic OR English:
     * Arabic: "الرقم", "الصنف", "الوصف", "الكمية", "الوحدة", "المواصفات"
     * English: "SL No", "ITEM", "DESCRIPTION", "QUANTITY", "QTY", "UNIT", "SPECIFICATIONS"
   - Extract EVERY row as SEPARATE item (each row = one array item)
   - DO NOT combine/summarize - if 50 rows, return 50 items
   
   Item description (وصف الصنف):
     * Preserve EXACTLY as written in original language
     * Include technical/medical terms, catalog numbers, codes
     * Examples:
       - "قفازات جراحية مقاس 7 / Surgical Gloves Size 7"
       - "حقن 5 مل معقمة / Syringes 5ml Sterile"
   
   Quantity (الكمية):
     * Extract numeric value only
     * Handle: "600", "٦٠٠", "ستمائة/Six Hundred" → 600
     * Handle: "1,000", "١٬٠٠٠" → 1000
     * Range "2-3 units" or "٢-٣" → 3 (use higher)
   
   Unit (الوحدة):
     * Keep original language (DON'T translate)
     * Arabic: "قطعة", "صندوق", "علبة", "وحدة", "مجموعة"
     * English: "PCS", "pieces", "boxes", "units", "sets", "kits"
   
   Example bilingual output:
     "items": [
       {"itemDescription": "قفازات جراحية مقاس 7.5 / Surgical Gloves Size 7.5", "quantity": 100, "unit": "صندوق/Box"},
       {"itemDescription": "حقن انسولين 1 مل / Insulin Syringes 1ml", "quantity": 5000, "unit": "قطعة/PCS"},
       {"itemDescription": "ضمادات / Bandages", "quantity": 250, "unit": "لفة/Roll"}
     ]

6. NOTES / ملاحظات:
   - Extract requirements, instructions, conditions in BOTH languages
   - Look for: "ملاحظات"/"Notes", "شروط"/"Conditions", "عينات"/"Samples", "شهادات"/"Certificates"
   - Include footnotes and asterisk notes (*)
   - Example: "يجب تقديم عينات / Samples must be submitted"

7. LANGUAGE DETECTION / تحديد اللغة:
   - Set "language" field: "ar" (Arabic only), "en" (English only), "ar-en" (bilingual)

OCR Tips for Bilingual Documents (نصائح):
- Process RTL (Arabic) and LTR (English) text
- Handle Arabic diacritics: َ ً ُ ٌ ِ ٍ ّ ْ
- Recognize Arabic (٠-٩) and Western (0-9) numerals
- Kuwait govt layout: Arabic right, English left
- Read tables carefully - preserve exact terms
- Handle clear and low-quality scans
- Recognize faint table borders

8. CONFIDENCE SCORES / درجة الثقة:
   - Rate extraction confidence (0.0 = uncertain/غير متأكد, 1.0 = certain/متأكد)
   - Base on:
     * Text clarity in both languages
     * Expected keywords found in either language
     * Data completeness
     * Consistency between Arabic/English (if bilingual)
     * OCR accuracy
   - overall: Average of all field confidences
   - Lower if:
     * Text blurry/obscured
     * Patterns not found
     * Inconsistencies between languages
     * Had to guess/assume
     * Heavy OCR errors

Return ONLY the JSON object. No markdown, no explanations.
JSON فقط بدون تنسيق أو شرح`;

// Extraction prompts for different document types
export const EXTRACTION_PROMPTS = {
  tender: TENDER_EXTRACTION_PROMPT,

  invoice: `Extract the following information from this invoice in JSON format:
{
  "invoiceNumber": "string",
  "invoiceDate": "ISO date string",
  "dueDate": "ISO date string",
  "vendor": {
    "name": "string",
    "address": "string",
    "taxId": "string"
  },
  "customer": {
    "name": "string",
    "address": "string"
  },
  "lineItems": [
    {
      "description": "string",
      "quantity": "number",
      "unitPrice": "number",
      "totalPrice": "number"
    }
  ],
  "subtotal": "number",
  "taxAmount": "number",
  "taxRate": "number",
  "totalAmount": "number",
  "currency": "string",
  "paymentTerms": "string",
  "notes": "string"
}
Return ONLY the JSON object, no additional text.`,

  expense: `Extract the following information from this expense receipt/document in JSON format:
{
  "vendorName": "string",
  "date": "ISO date string",
  "category": "string - expense category",
  "description": "string",
  "items": [
    {
      "name": "string",
      "quantity": "number",
      "price": "number"
    }
  ],
  "subtotal": "number",
  "taxAmount": "number",
  "totalAmount": "number",
  "currency": "string",
  "paymentMethod": "string - cash, card, etc.",
  "receiptNumber": "string"
}
Return ONLY the JSON object, no additional text.`,

  delivery: `Extract the following information from this delivery note/document in JSON format:
{
  "deliveryNumber": "string",
  "date": "ISO date string",
  "sender": {
    "name": "string",
    "address": "string"
  },
  "recipient": {
    "name": "string",
    "address": "string",
    "contactPerson": "string"
  },
  "items": [
    {
      "description": "string",
      "quantity": "number",
      "unit": "string",
      "batchNumber": "string",
      "serialNumbers": ["string"]
    }
  ],
  "vehicleInfo": "string",
  "driverName": "string",
  "receivedBy": "string",
  "receivedDate": "ISO date string",
  "condition": "string - goods condition on receipt",
  "notes": "string"
}
Return ONLY the JSON object, no additional text.`,
};

// Arabic to English field mapping for MOH Kuwait documents
export const ARABIC_FIELD_MAPPING = {
  'رقم المناقصة': 'tenderNumber',
  'عنوان المناقصة': 'title',
  'تاريخ الإغلاق': 'submissionDeadline',
  'تاريخ الفتح': 'openingDate',
  'القيمة التقديرية': 'estimatedValue',
  'الضمان المبدئي': 'bondAmount',
  'المواصفات الفنية': 'technicalRequirements',
  'شروط التسليم': 'deliveryTerms',
  'شروط الدفع': 'paymentTerms',
  'وزارة الصحة': 'Ministry of Health',
  مستشفى: 'Hospital',
  'المركز الطبي': 'Medical Center',
};
