/**
 * AI Tender Specification Analyzer
 * Analyzes tender specifications to identify:
 * - Manufacturers who produce matching products
 * - Competitors who might bid on the tender
 * - Market intelligence and pricing insights
 */

import { invokeUnifiedLLM, LLMProvider, Message } from './llm-provider'
import { sanitizePromptInput, createSafePrompt, validateAIResponse } from './prompt-sanitizer'

// Types for specification analysis
export interface ProductSpecification {
  name: string
  category: string
  specifications: Record<string, string | number>
  requiredCertifications?: string[]
  quantity?: number
  unit?: string
}

export interface ManufacturerInfo {
  name: string
  country: string
  website?: string
  productMatch: 'exact' | 'similar' | 'partial'
  matchingProducts: string[]
  estimatedPriceRange?: {
    min: number
    max: number
    currency: string
  }
  certifications?: string[]
  strengths?: string[]
  leadTime?: string
  notes?: string
}

export interface CompetitorInfo {
  name: string
  type: 'distributor' | 'manufacturer' | 'importer' | 'local_agent'
  country: string
  marketPresence: 'strong' | 'moderate' | 'emerging'
  likelyProducts: string[]
  competitiveAdvantage?: string[]
  historicalWinRate?: string
  notes?: string
}

export interface MarketIntelligence {
  marketSize?: string
  growthTrend?: 'growing' | 'stable' | 'declining'
  dominantPlayers?: string[]
  pricingTrends?: string
  regulatoryFactors?: string[]
  entryBarriers?: string[]
}

export interface SpecificationAnalysisResult {
  success: boolean
  specifications: ProductSpecification[]
  manufacturers: ManufacturerInfo[]
  competitors: CompetitorInfo[]
  marketIntelligence: MarketIntelligence
  recommendations: string[]
  analysisDate: string
  confidenceScore: number
  error?: string
}

// Analysis prompt for the AI
const SPECIFICATION_ANALYSIS_PROMPT = `You are an expert medical equipment and pharmaceutical market analyst with deep knowledge of:
- Global medical device manufacturers
- Pharmaceutical companies and distributors
- Middle East and GCC healthcare market
- Tender bidding processes and competitive landscape

Analyze the following tender specifications and provide comprehensive market intelligence.

TENDER SPECIFICATIONS:
{specifications}

TENDER CONTEXT:
- Organization: {organization}
- Country: {country}
- Tender Type: {tenderType}
- Estimated Value: {estimatedValue}

Provide your analysis in the following JSON format:
{
  "specifications": [
    {
      "name": "Product name",
      "category": "Category (e.g., Medical Devices, Pharmaceuticals, Lab Equipment)",
      "specifications": { "key": "value" },
      "requiredCertifications": ["ISO 13485", "CE Mark", etc.],
      "quantity": number,
      "unit": "string"
    }
  ],
  "manufacturers": [
    {
      "name": "Manufacturer name",
      "country": "Country",
      "website": "URL if known",
      "productMatch": "exact|similar|partial",
      "matchingProducts": ["Product names"],
      "estimatedPriceRange": { "min": number, "max": number, "currency": "USD" },
      "certifications": ["List of certifications"],
      "strengths": ["Key strengths"],
      "leadTime": "Typical lead time",
      "notes": "Additional notes"
    }
  ],
  "competitors": [
    {
      "name": "Company name",
      "type": "distributor|manufacturer|importer|local_agent",
      "country": "Country",
      "marketPresence": "strong|moderate|emerging",
      "likelyProducts": ["Products they might bid with"],
      "competitiveAdvantage": ["Their advantages"],
      "historicalWinRate": "High/Medium/Low if known",
      "notes": "Additional context"
    }
  ],
  "marketIntelligence": {
    "marketSize": "Estimated market size",
    "growthTrend": "growing|stable|declining",
    "dominantPlayers": ["Key market players"],
    "pricingTrends": "Current pricing trends",
    "regulatoryFactors": ["Key regulations"],
    "entryBarriers": ["Market entry challenges"]
  },
  "recommendations": [
    "Strategic recommendation 1",
    "Strategic recommendation 2"
  ],
  "confidenceScore": 0.0 to 1.0
}

Focus on:
1. Medical equipment manufacturers (Philips, GE Healthcare, Siemens, Medtronic, etc.)
2. Regional distributors in the Middle East
3. Local agents and importers
4. Pricing competitiveness
5. Regulatory requirements (FDA, CE, SFDA, etc.)

Be specific with manufacturer names and provide actionable intelligence.`

/**
 * Analyze tender specifications using AI
 */
export async function analyzeSpecifications(params: {
  specifications: string
  organization?: string
  country?: string
  tenderType?: string
  estimatedValue?: string
}): Promise<SpecificationAnalysisResult> {
  const {
    specifications,
    organization = 'Unknown',
    country = 'Kuwait',
    tenderType = 'Medical Equipment',
    estimatedValue = 'Not specified',
  } = params

  try {
    // Sanitize all user inputs to prevent prompt injection
    const prompt = createSafePrompt(SPECIFICATION_ANALYSIS_PROMPT, {
      specifications: sanitizePromptInput(specifications, { maxLength: 30000 }),
      organization: sanitizePromptInput(organization, { maxLength: 200 }),
      country: sanitizePromptInput(country, { maxLength: 100 }),
      tenderType: sanitizePromptInput(tenderType, { maxLength: 100 }),
      estimatedValue: sanitizePromptInput(estimatedValue, { maxLength: 100 }),
    })

    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a medical equipment market analyst. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    const result = await invokeUnifiedLLM(
      {
        messages,
        responseFormat: { type: 'json_object' },
      },
      { provider: LLMProvider.GEMINI }
    )

    const content = result.choices[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('No response from AI')
    }

    // Validate AI response for potential data leaks
    const responseValidation = validateAIResponse(content)
    if (!responseValidation.valid) {
      console.warn('AI response validation issues:', responseValidation.issues)
    }

    // Parse JSON response
    const analysis = JSON.parse(content)

    return {
      success: true,
      specifications: analysis.specifications || [],
      manufacturers: analysis.manufacturers || [],
      competitors: analysis.competitors || [],
      marketIntelligence: analysis.marketIntelligence || {},
      recommendations: analysis.recommendations || [],
      analysisDate: new Date().toISOString(),
      confidenceScore: analysis.confidenceScore || 0.7,
    }
  } catch (error) {
    // Don't log potentially sensitive data
    console.error('Specification analysis failed:', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      specifications: [],
      manufacturers: [],
      competitors: [],
      marketIntelligence: {},
      recommendations: [],
      analysisDate: new Date().toISOString(),
      confidenceScore: 0,
      error: error instanceof Error ? error.message : 'Analysis failed',
    }
  }
}

/**
 * Analyze specific product to find manufacturers
 */
export async function findManufacturers(params: {
  productName: string
  category: string
  specifications?: Record<string, string>
  certifications?: string[]
}): Promise<{ success: boolean; manufacturers: ManufacturerInfo[]; error?: string }> {
  const { productName, category, specifications = {}, certifications = [] } = params

  const specText = Object.entries(specifications)
    .map(([k, v]) => `${sanitizePromptInput(k, { maxLength: 100 })}: ${sanitizePromptInput(v, { maxLength: 500 })}`)
    .join('\n')

  const sanitizedProductName = sanitizePromptInput(productName, { maxLength: 200 })
  const sanitizedCategory = sanitizePromptInput(category, { maxLength: 100 })
  const sanitizedCertifications = certifications.map(c => sanitizePromptInput(c, { maxLength: 50 }))

  const prompt = `Find manufacturers for the following medical product:

Product: ${sanitizedProductName}
Category: ${sanitizedCategory}
Specifications:
${specText || 'Not specified'}
Required Certifications: ${sanitizedCertifications.join(', ') || 'Standard medical certifications'}

List all known manufacturers (global and regional) that produce this product or similar alternatives.
Include estimated pricing if known.

Respond with JSON array of manufacturers:
[
  {
    "name": "Manufacturer name",
    "country": "Country",
    "website": "URL",
    "productMatch": "exact|similar|partial",
    "matchingProducts": ["Product names"],
    "estimatedPriceRange": { "min": number, "max": number, "currency": "USD" },
    "certifications": ["Certifications"],
    "strengths": ["Key strengths"],
    "leadTime": "Lead time",
    "notes": "Notes"
  }
]`

  try {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a medical equipment sourcing expert. Respond with valid JSON array only.',
      },
      { role: 'user', content: prompt },
    ]

    const result = await invokeUnifiedLLM(
      {
        messages,
        responseFormat: { type: 'json_object' },
      },
      { provider: LLMProvider.GEMINI }
    )

    const content = result.choices[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content)
    const manufacturers = Array.isArray(parsed) ? parsed : parsed.manufacturers || []

    return { success: true, manufacturers }
  } catch (error) {
    console.error('Find manufacturers failed:', error)
    return {
      success: false,
      manufacturers: [],
      error: error instanceof Error ? error.message : 'Failed to find manufacturers',
    }
  }
}

/**
 * Identify likely competitors for a tender
 */
export async function identifyCompetitors(params: {
  tenderTitle: string
  organization: string
  country: string
  products: string[]
  estimatedValue?: number
}): Promise<{ success: boolean; competitors: CompetitorInfo[]; error?: string }> {
  const { tenderTitle, organization, country, products, estimatedValue } = params

  const sanitizedTitle = sanitizePromptInput(tenderTitle, { maxLength: 300 })
  const sanitizedOrg = sanitizePromptInput(organization, { maxLength: 200 })
  const sanitizedCountry = sanitizePromptInput(country, { maxLength: 100 })
  const sanitizedProducts = products.map(p => sanitizePromptInput(p, { maxLength: 200 }))

  const prompt = `Identify likely competitors who might bid on this tender:

Tender: ${sanitizedTitle}
Organization: ${sanitizedOrg}
Country: ${sanitizedCountry}
Products Required: ${sanitizedProducts.join(', ')}
Estimated Value: ${estimatedValue ? `$${estimatedValue.toLocaleString()}` : 'Not specified'}

List companies (distributors, agents, importers) likely to compete for this tender in the ${sanitizedCountry} market.
Focus on companies with established presence in ${sanitizedCountry} and the GCC region.

Respond with JSON:
{
  "competitors": [
    {
      "name": "Company name",
      "type": "distributor|manufacturer|importer|local_agent",
      "country": "Country",
      "marketPresence": "strong|moderate|emerging",
      "likelyProducts": ["Products they might bid"],
      "competitiveAdvantage": ["Their advantages"],
      "historicalWinRate": "High/Medium/Low",
      "notes": "Additional context"
    }
  ]
}`

  try {
    const messages: Message[] = [
      {
        role: 'system',
        content:
          'You are a competitive intelligence analyst for medical tenders. Respond with valid JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const result = await invokeUnifiedLLM(
      {
        messages,
        responseFormat: { type: 'json_object' },
      },
      { provider: LLMProvider.GEMINI }
    )

    const content = result.choices[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content)

    return {
      success: true,
      competitors: parsed.competitors || [],
    }
  } catch (error) {
    console.error('Identify competitors failed:', error)
    return {
      success: false,
      competitors: [],
      error: error instanceof Error ? error.message : 'Failed to identify competitors',
    }
  }
}

/**
 * Extract specifications from tender document text
 */
export async function extractSpecificationsFromText(
  documentText: string
): Promise<{ success: boolean; specifications: ProductSpecification[]; error?: string }> {
  // Sanitize document text to prevent prompt injection
  const sanitizedText = sanitizePromptInput(documentText, { maxLength: 15000 })

  const prompt = `Extract all product specifications from this tender document:

${sanitizedText}

Identify each product/item and extract:
- Product name
- Category
- Technical specifications
- Required certifications
- Quantity and units

Respond with JSON:
{
  "specifications": [
    {
      "name": "Product name",
      "category": "Category",
      "specifications": { "spec_name": "value" },
      "requiredCertifications": ["certifications"],
      "quantity": number,
      "unit": "string"
    }
  ]
}`

  try {
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a technical specification extractor. Respond with valid JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const result = await invokeUnifiedLLM(
      {
        messages,
        responseFormat: { type: 'json_object' },
      },
      { provider: LLMProvider.GEMINI }
    )

    const content = result.choices[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(content)

    return {
      success: true,
      specifications: parsed.specifications || [],
    }
  } catch (error) {
    console.error('Extract specifications failed:', error)
    return {
      success: false,
      specifications: [],
      error: error instanceof Error ? error.message : 'Failed to extract specifications',
    }
  }
}
