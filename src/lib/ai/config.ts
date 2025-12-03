/**
 * AI Service Configuration
 * Defines API keys, rate limits, and provider settings for the AI fallback chain
 */

export interface AIProviderConfig {
  name: string
  apiKey: string | undefined
  baseUrl?: string
  model: string
  maxTokens: number
  temperature: number
  rateLimitPerDay: number
  rateLimitPerMinute: number
  priority: number // Lower = higher priority
  isEnabled: boolean
  supportsVision: boolean
  supportsArabic: boolean
}

export interface AIServiceConfig {
  providers: AIProviderConfig[]
  defaultTimeout: number
  retryAttempts: number
  retryDelay: number
  cacheEnabled: boolean
  cacheTTL: number // seconds
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
}

// Provider cost per 1K tokens (approximate in USD)
export const PROVIDER_COSTS: Record<string, { prompt: number; completion: number }> = {
  groq: { prompt: 0.0001, completion: 0.0001 },
  gemini: { prompt: 0.00025, completion: 0.00050 },
  googleAI: { prompt: 0.00050, completion: 0.00150 },
  anthropic: { prompt: 0.00025, completion: 0.00125 },
}

// Main configuration
export const AI_CONFIG: AIServiceConfig = {
  providers: Object.values(AI_PROVIDERS)
    .filter((p) => p.isEnabled)
    .sort((a, b) => a.priority - b.priority),
  defaultTimeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour
}

/**
 * Validate AI provider API keys
 */
export function validateAIProviders(): { valid: string[]; invalid: string[] } {
  const results = { valid: [] as string[], invalid: [] as string[] }
  
  for (const [name, config] of Object.entries(AI_PROVIDERS)) {
    if (config.isEnabled && config.apiKey) {
      results.valid.push(name)
    } else if (config.isEnabled && !config.apiKey) {
      results.invalid.push(name)
    }
  }
  
  return results
}

/**
 * Calculate estimated cost for AI request
 */
export function estimateAICost(
  provider: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = PROVIDER_COSTS[provider]
  if (!costs) return 0
  
  return (
    (promptTokens / 1000) * costs.prompt +
    (completionTokens / 1000) * costs.completion
  )
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
}

// Enhanced tender extraction prompt from Dashboard (proven with real MOH documents)
export const TENDER_EXTRACTION_SYSTEM_PROMPT =
  "You are an expert OCR and document extraction system specialized in medical tender documents. You excel at reading tables, mixed-language text (Arabic/English), and extracting structured data with high accuracy. Always return valid JSON without markdown formatting.";

export const TENDER_EXTRACTION_PROMPT = `You are an expert document OCR and data extraction system. Carefully analyze this tender document image/PDF.

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
}

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
  'مستشفى': 'Hospital',
  'المركز الطبي': 'Medical Center',
}
