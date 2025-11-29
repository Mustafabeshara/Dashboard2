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
    model: 'gemini-1.5-flash',
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
    model: 'gemini-1.5-pro',
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

// Extraction prompts for different document types
export const EXTRACTION_PROMPTS = {
  tender: `Extract the following information from this tender document in JSON format:
{
  "tenderNumber": "string - the tender/RFP number",
  "title": "string - the tender title",
  "issuingAuthority": "string - the organization issuing the tender",
  "department": "string - specific department if mentioned",
  "submissionDeadline": "ISO date string - submission deadline",
  "openingDate": "ISO date string - bid opening date if mentioned",
  "estimatedValue": "number - estimated value if mentioned",
  "currency": "string - KWD, USD, etc.",
  "bondRequired": "boolean - whether a bid bond is required",
  "bondAmount": "number - bid bond amount if specified",
  "bondPercentage": "number - bid bond percentage if specified",
  "products": [
    {
      "name": "string - product/item name",
      "specifications": "string - technical specifications",
      "quantity": "number - required quantity",
      "unit": "string - unit of measure"
    }
  ],
  "technicalRequirements": ["string - key technical requirements"],
  "commercialRequirements": ["string - key commercial requirements"],
  "qualifications": ["string - required supplier qualifications"],
  "deliveryTerms": "string - delivery location and timeframe",
  "paymentTerms": "string - payment terms if mentioned",
  "contactInfo": {
    "name": "string",
    "email": "string",
    "phone": "string"
  },
  "notes": "string - any other important information"
}
Return ONLY the JSON object, no additional text.`,

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
