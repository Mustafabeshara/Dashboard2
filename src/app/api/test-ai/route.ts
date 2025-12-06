/**
 * AI Provider Test Endpoint
 * Public endpoint to test if AI providers are configured correctly
 */

import { NextResponse } from 'next/server'
import { getGroqApiKey, getGeminiApiKey, getForgeApiKey, isAnyProviderConfigured, getConfiguredProviders } from '@/lib/ai/api-keys'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [groqKey, geminiKey, forgeKey] = await Promise.all([
      getGroqApiKey(),
      getGeminiApiKey(),
      getForgeApiKey(),
    ])

    const providers: Record<string, { configured: boolean; source: string; keyPreview?: string }> = {}

    // Check Groq
    if (groqKey) {
      providers.groq = {
        configured: true,
        source: 'Loaded from ' + (groqKey.startsWith('gsk_') ? 'Railway/ENV' : 'database'),
        keyPreview: `${groqKey.slice(0, 8)}...${groqKey.slice(-4)}`
      }
    } else {
      providers.groq = { configured: false, source: 'Not configured' }
    }

    // Check Gemini
    if (geminiKey) {
      providers.gemini = {
        configured: true,
        source: 'Loaded from ' + (geminiKey.startsWith('AI') ? 'Railway/ENV' : 'database'),
        keyPreview: `${geminiKey.slice(0, 8)}...${geminiKey.slice(-4)}`
      }
    } else {
      providers.gemini = { configured: false, source: 'Not configured' }
    }

    // Check Forge/OpenAI
    if (forgeKey) {
      providers.forge = {
        configured: true,
        source: 'Loaded',
        keyPreview: `${forgeKey.slice(0, 8)}...${forgeKey.slice(-4)}`
      }
    } else {
      providers.forge = { configured: false, source: 'Not configured' }
    }

    // Test Groq API if configured
    if (groqKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${groqKey}` },
          signal: AbortSignal.timeout(10000),
        })
        
        if (response.ok) {
          const data = await response.json()
          providers.groq.source += ` ✓ (${data.data?.length || 0} models)`
        } else {
          providers.groq.source += ` ✗ HTTP ${response.status}`
        }
      } catch (error) {
        providers.groq.source += ` ✗ ${error instanceof Error ? error.message : 'Failed'}`
      }
    }

    // Test Gemini API if configured
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
          { signal: AbortSignal.timeout(10000) }
        )
        
        if (response.ok) {
          const data = await response.json()
          providers.gemini.source += ` ✓ (${data.models?.length || 0} models)`
        } else {
          const errorData = await response.json().catch(() => ({}))
          providers.gemini.source += ` ✗ ${errorData.error?.message || `HTTP ${response.status}`}`
        }
      } catch (error) {
        providers.gemini.source += ` ✗ ${error instanceof Error ? error.message : 'Failed'}`
      }
    }

    const anyConfigured = await isAnyProviderConfigured()
    const configuredList = await getConfiguredProviders()

    return NextResponse.json({
      success: true,
      anyProviderConfigured: anyConfigured,
      configuredProviders: configuredList,
      providers,
      envCheck: {
        GROQ_API_KEY: process.env.GROQ_API_KEY ? 
          (process.env.GROQ_API_KEY.includes('your-') ? 'PLACEHOLDER' : 'SET') : 'NOT_SET',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 
          (process.env.GEMINI_API_KEY.includes('your-') ? 'PLACEHOLDER' : 'SET') : 'NOT_SET',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 
          (process.env.OPENAI_API_KEY.includes('your-') ? 'PLACEHOLDER' : 'SET') : 'NOT_SET',
        FORGE_API_KEY: process.env.FORGE_API_KEY ? 'SET' : 'NOT_SET',
      },
      message: anyConfigured 
        ? `AI ready with: ${configuredList.join(', ')}`
        : 'No AI providers configured. Set API keys in Railway or via Settings > API Keys',
    })
  } catch (error) {
    console.error('AI test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
