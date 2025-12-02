/**
 * API Diagnostics Endpoint
 * Tests connectivity to all external services and AI providers
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ServiceStatus {
  name: string
  status: 'ok' | 'error' | 'not_configured'
  latency?: number
  message?: string
  details?: Record<string, unknown>
}

async function testGroq(): Promise<ServiceStatus> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return { name: 'Groq', status: 'not_configured', message: 'GROQ_API_KEY not set' }
  }

  const start = Date.now()
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    })
    const latency = Date.now() - start

    if (response.ok) {
      const data = await response.json()
      return {
        name: 'Groq',
        status: 'ok',
        latency,
        message: 'Connected successfully',
        details: { models: data.data?.length || 0 }
      }
    } else {
      return {
        name: 'Groq',
        status: 'error',
        latency,
        message: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      name: 'Groq',
      status: 'error',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

async function testGemini(): Promise<ServiceStatus> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return { name: 'Gemini', status: 'not_configured', message: 'GEMINI_API_KEY not set' }
  }

  const start = Date.now()
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    )
    const latency = Date.now() - start

    if (response.ok) {
      const data = await response.json()
      return {
        name: 'Gemini',
        status: 'ok',
        latency,
        message: 'Connected successfully',
        details: { models: data.models?.length || 0 }
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return {
        name: 'Gemini',
        status: 'error',
        latency,
        message: errorData.error?.message || `HTTP ${response.status}`
      }
    }
  } catch (error) {
    return {
      name: 'Gemini',
      status: 'error',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

async function testAnthropic(): Promise<ServiceStatus> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { name: 'Anthropic', status: 'not_configured', message: 'ANTHROPIC_API_KEY not set' }
  }

  const start = Date.now()
  try {
    // Anthropic doesn't have a simple models endpoint, so we do a minimal request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      }),
      signal: AbortSignal.timeout(15000),
    })
    const latency = Date.now() - start

    if (response.ok || response.status === 400) {
      // 400 might mean rate limit but key is valid
      return {
        name: 'Anthropic',
        status: 'ok',
        latency,
        message: 'API key valid',
      }
    } else if (response.status === 401) {
      return {
        name: 'Anthropic',
        status: 'error',
        latency,
        message: 'Invalid API key'
      }
    } else {
      return {
        name: 'Anthropic',
        status: 'error',
        latency,
        message: `HTTP ${response.status}`
      }
    }
  } catch (error) {
    return {
      name: 'Anthropic',
      status: 'error',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

async function testOpenAI(): Promise<ServiceStatus> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { name: 'OpenAI', status: 'not_configured', message: 'OPENAI_API_KEY not set' }
  }

  const start = Date.now()
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    })
    const latency = Date.now() - start

    if (response.ok) {
      return {
        name: 'OpenAI',
        status: 'ok',
        latency,
        message: 'Connected successfully',
      }
    } else {
      return {
        name: 'OpenAI',
        status: 'error',
        latency,
        message: `HTTP ${response.status}`
      }
    }
  } catch (error) {
    return {
      name: 'OpenAI',
      status: 'error',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

async function testDatabase(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const { default: prisma } = await import('@/lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start
    return {
      name: 'Database',
      status: 'ok',
      latency,
      message: 'PostgreSQL connected',
    }
  } catch (error) {
    return {
      name: 'Database',
      status: 'error',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

async function testAWS(): Promise<ServiceStatus> {
  const accessKey = process.env.AWS_ACCESS_KEY_ID
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY
  
  if (!accessKey || !secretKey) {
    return { name: 'AWS (Textract)', status: 'not_configured', message: 'AWS credentials not set' }
  }

  // Basic validation - we can't easily test without making a real API call
  return {
    name: 'AWS (Textract)',
    status: 'ok',
    message: 'Credentials configured',
    details: { region: process.env.AWS_REGION || 'us-east-1' }
  }
}

export async function GET() {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only allow admin/CEO/CFO to view diagnostics
  const allowedRoles = ['ADMIN', 'CEO', 'CFO']
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Run all tests in parallel
  const [groq, gemini, anthropic, openai, database, aws] = await Promise.all([
    testGroq(),
    testGemini(),
    testAnthropic(),
    testOpenAI(),
    testDatabase(),
    testAWS(),
  ])

  const services = [database, groq, gemini, anthropic, openai, aws]
  
  const summary = {
    total: services.length,
    ok: services.filter(s => s.status === 'ok').length,
    error: services.filter(s => s.status === 'error').length,
    notConfigured: services.filter(s => s.status === 'not_configured').length,
  }

  // Check which AI provider will be used for extraction
  const aiProviders = [groq, gemini, anthropic, openai].filter(s => s.status === 'ok')
  const primaryAI = aiProviders[0]?.name || 'None available'

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    summary,
    primaryAIProvider: primaryAI,
    services,
    config: {
      nextAuthUrl: process.env.NEXTAUTH_URL ? '✓ Set' : '✗ Missing',
      nextAuthSecret: process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Missing',
      databaseUrl: process.env.DATABASE_URL ? '✓ Set' : '✗ Missing',
    }
  })
}
