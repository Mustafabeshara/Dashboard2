/**
 * Tender Document Extractor
 * Specialized AI extraction for MOH Kuwait tender documents
 * 98% of revenue comes from government tenders - this is priority
 */

import { complete, AIResponse } from './ai-service-manager'
import { ARABIC_FIELD_MAPPING } from './config'

export interface TenderExtractedData {
  // Core identification
  tenderNumber: string
  title: string
  titleArabic?: string

  // Authority information
  issuingAuthority: string
  department?: string
  ministry?: string

  // Dates
  submissionDeadline?: string
  openingDate?: string
  clarificationDeadline?: string
  siteVisitDate?: string

  // Financial details
  estimatedValue?: number
  currency: string
  bondRequired: boolean
  bondAmount?: number
  bondPercentage?: number
  bondType?: 'CASH' | 'BANK_GUARANTEE' | 'INSURANCE'

  // Products/Items
  products: TenderProduct[]

  // Requirements
  technicalRequirements: string[]
  commercialRequirements: string[]
  qualifications: string[]

  // Delivery
  deliveryTerms?: string
  deliveryLocation?: string
  deliveryPeriod?: string

  // Payment
  paymentTerms?: string
  advancePayment?: number

  // Contact
  contactInfo?: {
    name?: string
    email?: string
    phone?: string
    address?: string
  }

  // Classification
  category?: string
  subcategory?: string
  mohDepartment?: string // MOH-specific department (Cardiac, Radiology, etc.)

  // Additional
  notes?: string
  warnings?: string[]
  confidence?: number
}

export interface TenderProduct {
  itemNumber?: string
  name: string
  nameArabic?: string
  description?: string
  specifications?: string
  quantity: number
  unit: string
  estimatedPrice?: number
  brand?: string
  manufacturer?: string
  modelNumber?: string
  category?: string
}

export interface ExtractionResult {
  success: boolean
  data: TenderExtractedData | null
  aiResponse: AIResponse
  processingNotes: string[]
  error?: string
}

// MOH Kuwait-specific tender extraction prompt
const MOH_TENDER_PROMPT = `You are an expert at extracting information from Kuwait Ministry of Health (MOH) tender documents.
These tenders are for medical equipment and supplies. Extract information carefully, especially:
- Arabic text should be preserved alongside English translations
- Medical product specifications are critical
- Bond requirements are usually specified as percentage of tender value
- Delivery is typically to specific hospitals or medical centers in Kuwait

Extract the following information in JSON format:
{
  "tenderNumber": "string - the tender/RFP number (e.g., MOH/2024/123)",
  "title": "string - English title",
  "titleArabic": "string - Arabic title if present",
  "issuingAuthority": "string - usually Ministry of Health Kuwait",
  "department": "string - specific MOH department",
  "ministry": "string - parent ministry",
  "submissionDeadline": "ISO date string - deadline for bid submission",
  "openingDate": "ISO date string - bid opening date",
  "clarificationDeadline": "ISO date string - deadline for questions",
  "siteVisitDate": "ISO date string - if site visit is mentioned",
  "estimatedValue": "number - estimated value without currency symbol",
  "currency": "string - KWD, USD, etc. (default KWD for MOH)",
  "bondRequired": "boolean - is bid bond required",
  "bondAmount": "number - exact bond amount if specified",
  "bondPercentage": "number - bond percentage if specified (usually 1-5%)",
  "bondType": "string - CASH, BANK_GUARANTEE, or INSURANCE",
  "products": [
    {
      "itemNumber": "string - item/line number",
      "name": "string - English name",
      "nameArabic": "string - Arabic name",
      "description": "string - detailed description",
      "specifications": "string - technical specifications",
      "quantity": "number - required quantity",
      "unit": "string - unit of measure (pcs, sets, boxes, etc.)",
      "estimatedPrice": "number - unit price if mentioned",
      "brand": "string - brand name if specified",
      "manufacturer": "string - manufacturer if specified",
      "modelNumber": "string - model/part number",
      "category": "string - medical category (cardiac, radiology, lab, etc.)"
    }
  ],
  "technicalRequirements": ["string - list of technical requirements"],
  "commercialRequirements": ["string - list of commercial/legal requirements"],
  "qualifications": ["string - required supplier qualifications/certifications"],
  "deliveryTerms": "string - delivery conditions",
  "deliveryLocation": "string - delivery address/hospital",
  "deliveryPeriod": "string - delivery timeframe (e.g., 60 days)",
  "paymentTerms": "string - payment conditions",
  "advancePayment": "number - advance payment percentage if any",
  "contactInfo": {
    "name": "string - contact person",
    "email": "string - contact email",
    "phone": "string - contact phone",
    "address": "string - tender office address"
  },
  "category": "string - main category (medical equipment, supplies, etc.)",
  "subcategory": "string - subcategory",
  "mohDepartment": "string - MOH department (Cardiac Surgery, Radiology, Laboratory, etc.)",
  "notes": "string - any other important information",
  "warnings": ["string - potential issues or missing information to flag"]
}

Return ONLY the JSON object, no additional text. If a field cannot be determined, omit it or set to null.`

// Generic tender extraction prompt
const GENERIC_TENDER_PROMPT = `Extract the following information from this tender document in JSON format:
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
Return ONLY the JSON object, no additional text.`

/**
 * Detect if document is from MOH Kuwait
 */
function isMOHTender(text: string): boolean {
  const mohIndicators = [
    'ministry of health',
    'وزارة الصحة',
    'moh kuwait',
    'moh/',
    'central medical stores',
    'المخازن الطبية المركزية',
    'kuwait',
    'الكويت',
  ]

  const lowerText = text.toLowerCase()
  return mohIndicators.some((indicator) => lowerText.includes(indicator.toLowerCase()))
}

/**
 * Extract tender data from document content
 */
export async function extractTenderData(
  documentContent: string,
  images?: string[],
  forceMOH: boolean = false
): Promise<ExtractionResult> {
  const processingNotes: string[] = []

  // Detect document type
  const isMOH = forceMOH || isMOHTender(documentContent)
  processingNotes.push(isMOH ? 'Detected MOH Kuwait tender' : 'Generic tender document')

  // Select appropriate prompt
  const prompt = isMOH ? MOH_TENDER_PROMPT : GENERIC_TENDER_PROMPT

  // Build full prompt with content
  const fullPrompt = images && images.length > 0
    ? `${prompt}\n\nAnalyze the document images provided.`
    : `${prompt}\n\nDocument content:\n${documentContent}`

  // Call AI service
  const response = await complete({
    prompt: fullPrompt,
    systemPrompt: 'You are a document extraction AI specializing in government tender documents, particularly from Kuwait. Extract information accurately and return only valid JSON.',
    images,
    taskType: images ? 'vision' : 'documentExtraction',
    temperature: 0,
  })

  if (!response.success) {
    return {
      success: false,
      data: null,
      aiResponse: response,
      processingNotes,
      error: response.error,
    }
  }

  // Parse JSON response
  try {
    let jsonString = response.content.trim()

    // Handle markdown code blocks
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```$/g, '')
    }

    const data = JSON.parse(jsonString) as TenderExtractedData

    // Add processing metadata
    processingNotes.push(`Extracted by ${response.provider} using ${response.model}`)
    processingNotes.push(`Latency: ${response.latency}ms`)

    // Validate critical fields
    if (!data.tenderNumber) {
      processingNotes.push('Warning: Tender number not found')
    }
    if (!data.submissionDeadline) {
      processingNotes.push('Warning: Submission deadline not found')
    }
    if (!data.products || data.products.length === 0) {
      processingNotes.push('Warning: No products/items extracted')
    }

    // Calculate confidence based on completeness
    const requiredFields = ['tenderNumber', 'title', 'submissionDeadline', 'products']
    const presentFields = requiredFields.filter(
      (f) => data[f as keyof TenderExtractedData] !== undefined &&
             data[f as keyof TenderExtractedData] !== null
    )
    data.confidence = (presentFields.length / requiredFields.length) * 100

    return {
      success: true,
      data,
      aiResponse: response,
      processingNotes,
    }
  } catch (error) {
    processingNotes.push(`JSON parse error: ${error}`)
    return {
      success: false,
      data: null,
      aiResponse: response,
      processingNotes,
      error: `Failed to parse AI response as JSON: ${response.content.substring(0, 200)}...`,
    }
  }
}

/**
 * Extract product list from tender (optimized for BOQ documents)
 */
export async function extractTenderProducts(
  documentContent: string,
  images?: string[]
): Promise<{
  success: boolean
  products: TenderProduct[]
  error?: string
}> {
  const prompt = `Extract all products/items from this tender Bill of Quantities (BOQ) document.
Return a JSON array of products:
[
  {
    "itemNumber": "string - item/line number",
    "name": "string - product name",
    "nameArabic": "string - Arabic name if present",
    "description": "string - description",
    "specifications": "string - technical specs",
    "quantity": "number",
    "unit": "string - unit of measure",
    "estimatedPrice": "number - if shown",
    "brand": "string - if specified",
    "manufacturer": "string - if specified",
    "modelNumber": "string - if shown",
    "category": "string - medical category"
  }
]
Return ONLY the JSON array.`

  const response = await complete({
    prompt: `${prompt}\n\nDocument content:\n${documentContent}`,
    systemPrompt: 'You are an expert at extracting product lists from medical tender documents.',
    images,
    taskType: images ? 'vision' : 'documentExtraction',
    temperature: 0,
  })

  if (!response.success) {
    return { success: false, products: [], error: response.error }
  }

  try {
    let jsonString = response.content.trim()
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```$/g, '')
    }

    const products = JSON.parse(jsonString) as TenderProduct[]
    return { success: true, products }
  } catch {
    return {
      success: false,
      products: [],
      error: `Failed to parse products: ${response.content.substring(0, 100)}...`,
    }
  }
}

/**
 * Map Arabic fields to English using predefined mapping
 */
export function translateArabicFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const translated: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    // Check if key is Arabic and has mapping
    const englishKey = ARABIC_FIELD_MAPPING[key as keyof typeof ARABIC_FIELD_MAPPING] || key
    translated[englishKey] = value
  }

  return translated
}

/**
 * Auto-populate tender form from extracted data
 */
export function mapExtractedToTenderForm(extracted: TenderExtractedData): Record<string, unknown> {
  return {
    tenderNumber: extracted.tenderNumber,
    title: extracted.title,
    description: extracted.notes,
    department: extracted.department || extracted.mohDepartment,
    category: extracted.category,
    submissionDeadline: extracted.submissionDeadline,
    openingDate: extracted.openingDate,
    estimatedValue: extracted.estimatedValue,
    currency: extracted.currency || 'KWD',
    bondRequired: extracted.bondRequired,
    bondAmount: extracted.bondAmount,
    technicalRequirements: extracted.technicalRequirements?.join('\n'),
    commercialRequirements: extracted.commercialRequirements?.join('\n'),
    products: extracted.products?.map((p) => ({
      name: p.name,
      description: p.description,
      specifications: p.specifications,
      quantity: p.quantity,
      unit: p.unit,
      estimatedPrice: p.estimatedPrice,
    })),
  }
}
