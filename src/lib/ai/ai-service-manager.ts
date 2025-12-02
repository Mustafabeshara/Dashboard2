/**
 * AI Service Manager
 * Handles the fallback chain for AI providers with rate limiting and error handling
 */

import { AI_CONFIG, AI_PROVIDERS, AIProviderConfig, TASK_MODELS } from './config'

export interface AIRequest {
  prompt: string
  systemPrompt?: string
  images?: string[] // Base64 encoded images
  maxTokens?: number
  temperature?: number
  taskType?: keyof typeof TASK_MODELS
}

export interface AIResponse {
  success: boolean
  content: string
  provider: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: {
    provider: string
    promptTokens: number
    completionTokens: number
    estimatedCost: number
  }
  cached?: boolean
  error?: string
  latency?: number
}

interface RateLimitTracker {
  [provider: string]: {
    minuteCount: number
    minuteReset: number
    dayCount: number
    dayReset: number
  }
}

// In-memory rate limit tracking
const rateLimits: RateLimitTracker = {}

// Simple in-memory cache
const responseCache: Map<string, { response: AIResponse; expiry: number }> = new Map()

/**
 * Initialize rate limit tracker for a provider
 */
function initRateLimits(provider: string): void {
  if (!rateLimits[provider]) {
    const now = Date.now()
    rateLimits[provider] = {
      minuteCount: 0,
      minuteReset: now + 60000,
      dayCount: 0,
      dayReset: now + 86400000,
    }
  }
}

/**
 * Check if provider is within rate limits
 */
function checkRateLimits(provider: AIProviderConfig): boolean {
  initRateLimits(provider.name)
  const limits = rateLimits[provider.name]
  const now = Date.now()

  // Reset counters if time windows have passed
  if (now > limits.minuteReset) {
    limits.minuteCount = 0
    limits.minuteReset = now + 60000
  }
  if (now > limits.dayReset) {
    limits.dayCount = 0
    limits.dayReset = now + 86400000
  }

  return (
    limits.minuteCount < provider.rateLimitPerMinute &&
    limits.dayCount < provider.rateLimitPerDay
  )
}

/**
 * Increment rate limit counters
 */
function incrementRateLimits(provider: string): void {
  initRateLimits(provider)
  rateLimits[provider].minuteCount++
  rateLimits[provider].dayCount++
}

/**
 * Generate cache key from request
 */
function getCacheKey(request: AIRequest): string {
  return `${request.prompt}-${request.systemPrompt || ''}-${request.taskType || ''}`
}

/**
 * Get cached response if available
 */
function getCachedResponse(request: AIRequest): AIResponse | null {
  if (!AI_CONFIG.cacheEnabled) return null

  const key = getCacheKey(request)
  const cached = responseCache.get(key)

  if (cached && cached.expiry > Date.now()) {
    return { ...cached.response, cached: true }
  }

  if (cached) {
    responseCache.delete(key)
  }

  return null
}

/**
 * Cache a response
 */
function cacheResponse(request: AIRequest, response: AIResponse): void {
  if (!AI_CONFIG.cacheEnabled || !response.success) return

  const key = getCacheKey(request)
  responseCache.set(key, {
    response,
    expiry: Date.now() + AI_CONFIG.cacheTTL * 1000,
  })
}

/**
 * Call Groq API
 */
async function callGroq(
  config: AIProviderConfig,
  request: AIRequest
): Promise<AIResponse> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(request.systemPrompt
          ? [{ role: 'system', content: request.systemPrompt }]
          : []),
        { role: 'user', content: request.prompt },
      ],
      max_tokens: request.maxTokens || config.maxTokens,
      temperature: request.temperature ?? config.temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return {
    success: true,
    content: data.choices[0]?.message?.content || '',
    provider: config.name,
    model: config.model,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }
}

/**
 * Call Gemini API
 */
async function callGemini(
  config: AIProviderConfig,
  request: AIRequest
): Promise<AIResponse> {
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = []

  // Add images if present
  if (request.images && request.images.length > 0) {
    for (const image of request.images) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: image.replace(/^data:image\/\w+;base64,/, ''),
        },
      })
    }
  }

  // Add text prompt
  const fullPrompt = request.systemPrompt
    ? `${request.systemPrompt}\n\n${request.prompt}`
    : request.prompt
  parts.push({ text: fullPrompt })

  const response = await fetch(
    `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: request.maxTokens || config.maxTokens,
          temperature: request.temperature ?? config.temperature,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  return {
    success: true,
    content: text,
    provider: config.name,
    model: config.model,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
  }
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  config: AIProviderConfig,
  request: AIRequest
): Promise<AIResponse> {
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

  const content: ContentBlock[] = []

  // Add images if present
  if (request.images && request.images.length > 0) {
    for (const image of request.images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: image.replace(/^data:image\/\w+;base64,/, ''),
        },
      })
    }
  }

  // Add text prompt
  content.push({ type: 'text', text: request.prompt })

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: request.maxTokens || config.maxTokens,
      system: request.systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  return {
    success: true,
    content: text,
    provider: config.name,
    model: config.model,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  }
}

/**
 * Call a specific AI provider
 */
async function callProvider(
  provider: AIProviderConfig,
  request: AIRequest
): Promise<AIResponse> {
  const startTime = Date.now()

  try {
    let response: AIResponse

    switch (provider.name) {
      case 'Groq':
        response = await callGroq(provider, request)
        break
      case 'Gemini':
      case 'Google AI Studio':
        response = await callGemini(provider, request)
        break
      case 'Claude (Anthropic)':
        response = await callAnthropic(provider, request)
        break
      default:
        throw new Error(`Unknown provider: ${provider.name}`)
    }

    response.latency = Date.now() - startTime
    incrementRateLimits(provider.name)
    return response
  } catch (error) {
    return {
      success: false,
      content: '',
      provider: provider.name,
      model: provider.model,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime,
    }
  }
}

/**
 * Get available providers for a task
 */
function getProvidersForTask(taskType?: keyof typeof TASK_MODELS): AIProviderConfig[] {
  if (!taskType) {
    return AI_CONFIG.providers
  }

  const preferredProviders = TASK_MODELS[taskType]
  return AI_CONFIG.providers
    .filter((p) => preferredProviders.some((name) =>
      p.name.toLowerCase().includes(name.toLowerCase())
    ))
    .sort((a, b) => {
      const aIndex = preferredProviders.findIndex((name) =>
        a.name.toLowerCase().includes(name.toLowerCase())
      )
      const bIndex = preferredProviders.findIndex((name) =>
        b.name.toLowerCase().includes(name.toLowerCase())
      )
      return aIndex - bIndex
    })
}

/**
 * Main AI completion function with fallback chain
 */
export async function complete(request: AIRequest): Promise<AIResponse> {
  // Check cache first
  const cached = getCachedResponse(request)
  if (cached) {
    return cached
  }

  // Get providers for this task
  const providers = getProvidersForTask(request.taskType)

  if (providers.length === 0) {
    return {
      success: false,
      content: '',
      provider: 'none',
      model: 'none',
      error: 'No AI providers configured',
    }
  }

  // Filter providers based on requirements
  const eligibleProviders = providers.filter((p) => {
    // Check if vision is needed
    if (request.images && request.images.length > 0 && !p.supportsVision) {
      return false
    }
    // Check rate limits
    if (!checkRateLimits(p)) {
      return false
    }
    return true
  })

  if (eligibleProviders.length === 0) {
    return {
      success: false,
      content: '',
      provider: 'none',
      model: 'none',
      error: 'No eligible providers available (rate limits or capability mismatch)',
    }
  }

  // Try each provider in order
  const errors: string[] = []

  for (const provider of eligibleProviders) {
    for (let attempt = 0; attempt < AI_CONFIG.retryAttempts; attempt++) {
      const response = await callProvider(provider, request)

      if (response.success) {
        cacheResponse(request, response)
        return response
      }

      errors.push(`${provider.name}: ${response.error}`)

      // Wait before retry
      if (attempt < AI_CONFIG.retryAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, AI_CONFIG.retryDelay * (attempt + 1))
        )
      }
    }
  }

  return {
    success: false,
    content: '',
    provider: 'none',
    model: 'none',
    error: `All providers failed: ${errors.join('; ')}`,
  }
}

/**
 * Extract structured data from document
 */
export async function extractFromDocument(
  documentType: 'tender' | 'invoice' | 'expense' | 'delivery',
  content: string,
  images?: string[]
): Promise<{ success: boolean; data: Record<string, unknown> | null; error?: string }> {
  const { EXTRACTION_PROMPTS } = await import('./config')

  const prompt = EXTRACTION_PROMPTS[documentType]
  const fullPrompt = images && images.length > 0
    ? `${prompt}\n\nDocument content:\n${content}`
    : `${prompt}\n\nDocument content:\n${content}`

  const response = await complete({
    prompt: fullPrompt,
    systemPrompt: 'You are a document extraction AI. Extract information accurately and return only valid JSON.',
    images,
    taskType: images ? 'vision' : 'documentExtraction',
    temperature: 0,
  })

  if (!response.success) {
    return { success: false, data: null, error: response.error }
  }

  try {
    // Try to parse JSON from response
    let jsonString = response.content.trim()

    // Handle markdown code blocks
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```$/g, '')
    }

    const data = JSON.parse(jsonString)
    return { success: true, data }
  } catch {
    return {
      success: false,
      data: null,
      error: `Failed to parse JSON: ${response.content.substring(0, 100)}...`,
    }
  }
}

/**
 * Summarize a document
 */
export async function summarize(
  content: string,
  maxLength: number = 200
): Promise<AIResponse> {
  return complete({
    prompt: `Summarize the following document in ${maxLength} words or less. Focus on key points and important details:\n\n${content}`,
    systemPrompt: 'You are a document summarization AI. Create concise, accurate summaries.',
    taskType: 'summarization',
  })
}

/**
 * Translate Arabic text to English
 */
export async function translateArabicToEnglish(
  arabicText: string
): Promise<AIResponse> {
  return complete({
    prompt: `Translate the following Arabic text to English, preserving formatting and structure:\n\n${arabicText}`,
    systemPrompt: 'You are a professional Arabic to English translator specializing in medical and business documents.',
    taskType: 'arabicProcessing',
  })
}

/**
 * Get current rate limit status for all providers
 */
export function getRateLimitStatus(): Record<
  string,
  { available: boolean; minuteRemaining: number; dayRemaining: number }
> {
  const status: Record<string, { available: boolean; minuteRemaining: number; dayRemaining: number }> = {}

  for (const provider of AI_CONFIG.providers) {
    initRateLimits(provider.name)
    const limits = rateLimits[provider.name]
    const now = Date.now()

    // Reset if needed
    if (now > limits.minuteReset) {
      limits.minuteCount = 0
      limits.minuteReset = now + 60000
    }
    if (now > limits.dayReset) {
      limits.dayCount = 0
      limits.dayReset = now + 86400000
    }

    status[provider.name] = {
      available: checkRateLimits(provider),
      minuteRemaining: provider.rateLimitPerMinute - limits.minuteCount,
      dayRemaining: provider.rateLimitPerDay - limits.dayCount,
    }
  }

  return status
}
