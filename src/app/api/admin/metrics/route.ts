/**
 * Performance Metrics API
 * Returns system performance statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exportMetricsSummary, getStats } from '@/lib/performance'
import { getRateLimitStatus } from '@/lib/ai/ai-service-manager'
import { runHealthChecks } from '@/lib/ai/health-check'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admins to view full metrics
    if (session.user.role !== 'ADMIN' && session.user.role !== 'CEO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    const includeAI = searchParams.get('includeAI') === 'true'

    // Get performance metrics
    const metrics = exportMetricsSummary()

    // Get AI provider status
    const aiRateLimits = getRateLimitStatus()

    // Optional: Run AI health checks (takes a few seconds)
    let aiHealth = null
    if (includeAI) {
      aiHealth = await runHealthChecks()
    }

    const response: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      performance: {
        summary: {
          queries: getStats('query'),
          apiCalls: getStats('api_call'),
          aiRequests: getStats('ai_request'),
          cache: getStats('cache'),
        },
      },
      ai: {
        rateLimits: aiRateLimits,
        health: aiHealth,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    }

    if (detailed) {
      const currentPerf = response.performance as Record<string, unknown>
      response.performance = {
        ...currentPerf,
        slowOperations: metrics.slowOperations,
        detailedStats: metrics.stats,
        metricsCount: metrics.totalMetrics,
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}

// POST - Run specific performance actions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'health-check':
        const health = await runHealthChecks()
        return NextResponse.json({ success: true, health })

      case 'test-provider':
        const { provider } = body
        if (!provider) {
          return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
        }
        const { testProviderConnection } = await import('@/lib/ai/health-check')
        const result = await testProviderConnection(provider)
        return NextResponse.json({ success: true, result })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error performing action:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}
