/**
 * AI Provider Configuration API
 * Manages AI provider settings (read from environment-based config)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AI_PROVIDERS, validateAIProviders, PROVIDER_COSTS } from '@/lib/ai/config'

// GET - Fetch all AI providers (from environment config)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const validation = validateAIProviders()

    // Return provider info with masked API keys
    const providers = Object.entries(AI_PROVIDERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      model: config.model,
      isEnabled: config.isEnabled,
      hasApiKey: !!config.apiKey,
      priority: config.priority,
      rateLimitPerMinute: config.rateLimitPerMinute,
      rateLimitPerDay: config.rateLimitPerDay,
      supportsVision: config.supportsVision,
      supportsArabic: config.supportsArabic,
      costs: PROVIDER_COSTS[key] || { prompt: 0, completion: 0 },
    }))

    return NextResponse.json({
      providers,
      validation,
      message: 'AI providers are configured via environment variables',
    })
  } catch (error) {
    console.error('Error fetching AI providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI providers' },
      { status: 500 }
    )
  }
}

// POST - Test AI provider connection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { provider, action } = body

    if (action === 'test' && provider) {
      // Import the test function dynamically
      const { testProviderConnection } = await import('@/lib/ai/health-check')
      const result = await testProviderConnection(provider)
      return NextResponse.json(result)
    }

    return NextResponse.json({
      message: 'AI provider configuration is managed via environment variables. Update your .env file or Railway dashboard to change settings.',
      documentation: 'See DEPLOYMENT_GUIDE.md for configuration instructions',
    })
  } catch (error) {
    console.error('Error with AI provider action:', error)
    return NextResponse.json(
      { error: 'Failed to perform AI provider action' },
      { status: 500 }
    )
  }
}
