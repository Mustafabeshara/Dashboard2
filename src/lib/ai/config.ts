/**
 * AI Service Configuration
 * Optimized for Railway deployment and Electron standalone
 * Fallback chain: Groq (free tier) → Gemini → Google AI → Anthropic
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

// Provider configurations optimized for free tier usage
export const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  groq: {
    name: 'Groq',
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-70b-versatile', // Free tier model
    maxTokens: 8192,
    temperature: 0.1,
    rateLimitPerDay: 14400, // Free tier: 14,400 requests/day
    rateLimitPerMinute: 30, // Free tier: 30 requests/minute
    priority: 1, // PRIMARY - Fastest and free
    isEnabled: !!process.env.GROQ_API_KEY,
    supportsVision: false,
    supportsArabic: true,
  },
  gemini: {
    name: 'Gemini',
    apiKey: process.env.GEMINI_API_KEY,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash-exp', // Free tier model
    maxTokens: 8192,
    temperature: 0.1,
    rateLimitPerDay: 1500, // Free tier: 1,500 requests/day
    rateLimitPerMinute: 15, // Free tier: 15 requests/minute
    priority: 2, // SECONDARY - Vision support
    isEnabled: !!process.env.GEMINI_API_KEY,
    supportsVision: true,
    supportsArabic: true,
  },
  googleAI: {
    name: 'Google AI Studio',
    apiKey: process.env.GOOGLE_AI_API_KEY,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash-exp', // Free tier model
    maxTokens: 8192,
    temperature: 0.1,
    rateLimitPerDay: 1500, // Free tier: 1,500 requests/day
    rateLimitPerMinute: 15, // Free tier: 15 requests/minute
    priority: 3, // TERTIARY - Backup for Gemini
    isEnabled: !!process.env.GOOGLE_AI_API_KEY,
    supportsVision: true,
    supportsArabic: true,
  },
  anthropic: {
    name: 'Claude (Anthropic)',
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307', // Most affordable model
    maxTokens: 4096,
    temperature: 0.1,
    rateLimitPerDay: 500, // Conservative limit
    rateLimitPerMinute: 5,
    priority: 4, // LAST RESORT - Paid fallback
    isEnabled: !!process.env.ANTHROPIC_API_KEY,
    supportsVision: true,
    supportsArabic: true,
  },
};

// Provider cost per 1K tokens (approximate in USD)
export const PROVIDER_COSTS: Record<string, { prompt: number; completion: number }> = {
  groq: { prompt: 0.0, completion: 0.0 }, // FREE
  gemini: { prompt: 0.0, completion: 0.0 }, // FREE (within limits)
  googleAI: { prompt: 0.0, completion: 0.0 }, // FREE (within limits)
  anthropic: { prompt: 0.00025, completion: 0.00125 }, // PAID
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

// Task-specific model recommendations (prioritizing free tier)
export const TASK_MODELS = {
  // Document extraction - needs accuracy and vision
  documentExtraction: ['gemini', 'googleAI', 'anthropic'],
  // Quick summaries - speed prioritized
  summarization: ['groq', 'gemini'],
  // Arabic text processing
  arabicProcessing: ['gemini', 'googleAI', 'groq'],
  // Vision tasks (OCR, image analysis) - use Google Vision API primarily
  vision: ['gemini', 'googleAI', 'anthropic'],
  // Complex analysis
  complexAnalysis: ['groq', 'gemini', 'googleAI'],
};

// OCR Configuration - Google Vision API
export const OCR_CONFIG = {
  provider: 'google-vision',
  apiKey: process.env.GOOGLE_VISION_API_KEY,
  endpoint: 'https://vision.googleapis.com/v1/images:annotate',
  features: [
    'TEXT_DETECTION', // For printed text
    'DOCUMENT_TEXT_DETECTION', // For dense text documents
  ],
  languageHints: ['ar', 'en'], // Arabic and English
  maxResults: 50,
};

/**
 * Validate OCR provider API key
 */
export function validateOCRProvider(): boolean {
  return !!process.env.GOOGLE_VISION_API_KEY;
}

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
   - DO NOT include punctuation (:, ., etc.)
   - DO NOT extract dates as reference

2. TITLE / العنوان:
   - Extract main subject in original language(s)
   - Preserve technical/medical terms exactly

3. ORGANIZATION / الجهة المصدرة:
   - Look for: "وزارة الصحة", "Ministry of Health", "MOH", "MEDICAL STORE ADMINISTRATION"
   - Include ministry + department if present

4. CLOSING DATE / تاريخ الإغلاق:
   - Look for: "تاريخ الإغلاق", "CLOSING DATE", "DEADLINE"
   - Convert to YYYY-MM-DD format

5. ITEMS TABLE / جدول الأصناف:
   - Extract EVERY row as SEPARATE item
   - Preserve original language for descriptions
   - Extract numeric quantities only

6. CONFIDENCE SCORES:
   - Rate extraction confidence (0.0-1.0)
   - Base on text clarity and data completeness

Return ONLY the JSON object. No markdown code blocks, no explanations.`;


// Document extraction prompts for different document types
export const EXTRACTION_PROMPTS = {
  tender: TENDER_EXTRACTION_PROMPT,
  invoice: `Extract invoice data from this document. Return valid JSON with fields: invoiceNumber, date, vendor, items (array with description, quantity, unitPrice, total), subtotal, tax, total, currency.`,
  expense: `Extract expense data from this document. Return valid JSON with fields: date, category, description, amount, currency, vendor, paymentMethod.`,
  delivery: `Extract delivery note data from this document. Return valid JSON with fields: deliveryNumber, date, items (array with description, quantity), sender, recipient, status.`
};


// Arabic to English field mapping for tender documents
export const ARABIC_FIELD_MAPPING = {
  'رقم_المرجع': 'reference',
  'العنوان': 'title',
  'الجهة': 'organization',
  'تاريخ_الإغلاق': 'closingDate',
  'الأصناف': 'items',
  'الوصف': 'description',
  'الكمية': 'quantity',
  'الوحدة': 'unit',
  'السعر': 'price',
  'المجموع': 'total',
} as const;
