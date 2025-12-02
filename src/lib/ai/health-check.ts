/**
 * AI Provider Health Check
 * Tests connectivity and validates API keys for all AI providers
 */

import { AI_PROVIDERS, AIProviderConfig, PROVIDER_COSTS } from './config'
import { logger } from '../logger'

export interface ProviderHealthResult {
  provider: string
  success: boolean
  latency?: number
  error?: string
  model?: string
  tokensUsed?: number
  estimatedCost?: number
}

export interface HealthCheckSummary {
  timestamp: string
  totalProviders: number
  healthyProviders: number
  degradedProviders: number
  unhealthyProviders: number
  results: ProviderHealthResult[]
  recommendedProvider?: string
}

/**
 * Test a single provider connection with a minimal request
 */
export async function testProviderConnection(
  providerKey: string
): Promise<ProviderHealthResult> {
  const config = AI_PROVIDERS[providerKey]
  
  if (!config) {
    return {
      provider: providerKey,
      success: false,
      error: `Unknown provider: ${providerKey}`,
    }
  }

  if (!config.isEnabled || !config.apiKey) {
    return {
      provider: config.name,
      success: false,
      error: 'Provider not configured or API key missing',
    }
  }

  const start = Date.now()

  try {
    switch (providerKey) {
      case 'groq':
        return await testGroq(config, start)
      case 'gemini':
      case 'googleAI':
        return await testGemini(config, start)
      case 'anthropic':
        return await testAnthropic(config, start)
      default:
        return {
          provider: config.name,
          success: false,
          error: `Test not implemented for provider: ${providerKey}`,
        }
    }
  } catch (error) {
    const latency = Date.now() - start
    logger.error(`Health check failed for ${config.name}`, error as Error, {
      context: { provider: providerKey, latency },
    })
    
    return {
      provider: config.name,
      success: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test Groq API connection
 */
async function testGroq(
  config: AIProviderConfig,
  startTime: number
): Promise<ProviderHealthResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Say "ok"' }],
        max_tokens: 5,
        temperature: 0,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const latency = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      return {
        provider: config.name,
        success: false,
        latency,
        error: `API error: ${response.status} - ${error}`,
      }
    }

    const data = await response.json()
    const tokensUsed = data.usage?.total_tokens || 0
    const costs = PROVIDER_COSTS.groq

    return {
      provider: config.name,
      success: true,
      latency,
      model: config.model,
      tokensUsed,
      estimatedCost: (tokensUsed / 1000) * (costs.prompt + costs.completion) / 2,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Test Gemini API connection
 */
async function testGemini(
  config: AIProviderConfig,
  startTime: number
): Promise<ProviderHealthResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(
      `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "ok"' }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0 },
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeout)
    const latency = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      return {
        provider: config.name,
        success: false,
        latency,
        error: `API error: ${response.status} - ${error}`,
      }
    }

    const data = await response.json()
    const tokensUsed = data.usageMetadata?.totalTokenCount || 0
    const costs = PROVIDER_COSTS.gemini

    return {
      provider: config.name,
      success: true,
      latency,
      model: config.model,
      tokensUsed,
      estimatedCost: (tokensUsed / 1000) * (costs.prompt + costs.completion) / 2,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Test Anthropic API connection
 */
async function testAnthropic(
  config: AIProviderConfig,
  startTime: number
): Promise<ProviderHealthResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const latency = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      return {
        provider: config.name,
        success: false,
        latency,
        error: `API error: ${response.status} - ${error}`,
      }
    }

    const data = await response.json()
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    const costs = PROVIDER_COSTS.anthropic

    return {
      provider: config.name,
      success: true,
      latency,
      model: config.model,
      tokensUsed,
      estimatedCost: (tokensUsed / 1000) * (costs.prompt + costs.completion) / 2,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Run health checks on all configured providers
 */
export async function runHealthChecks(): Promise<HealthCheckSummary> {
  const enabledProviders = Object.entries(AI_PROVIDERS)
    .filter(([, config]) => config.isEnabled)
    .map(([key]) => key)

  const results = await Promise.all(
    enabledProviders.map((key) => testProviderConnection(key))
  )

  const healthy = results.filter((r) => r.success)
  const unhealthy = results.filter((r) => !r.success)

  // Find fastest healthy provider
  const fastestHealthy = healthy
    .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity))[0]

  logger.info('AI provider health check completed', {
    context: {
      total: results.length,
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      recommendedProvider: fastestHealthy?.provider,
    },
  })

  return {
    timestamp: new Date().toISOString(),
    totalProviders: results.length,
    healthyProviders: healthy.length,
    degradedProviders: 0,
    unhealthyProviders: unhealthy.length,
    results,
    recommendedProvider: fastestHealthy?.provider,
  }
}

/**
 * Quick check if any AI provider is available
 */
export async function isAIAvailable(): Promise<boolean> {
  const enabledProviders = Object.entries(AI_PROVIDERS)
    .filter(([, config]) => config.isEnabled)
    .map(([key]) => key)

  if (enabledProviders.length === 0) {
    return false
  }

  // Test first enabled provider
  const result = await testProviderConnection(enabledProviders[0])
  return result.success
}
