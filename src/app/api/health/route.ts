/**
 * Health Check API Endpoint
 * Comprehensive system health monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIProviders } from '@/lib/ai/config'
import { getEnvironmentInfo } from '@/lib/env-validator'

interface HealthCheck {
  name: string
  status: 'ok' | 'degraded' | 'down'
  message?: string
  latency?: number
  details?: Record<string, any>
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      name: 'database',
      status: 'ok',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'database',
      status: 'down',
      message: error instanceof Error ? error.message : 'Database connection failed',
      latency: Date.now() - start,
    }
  }
}

async function checkAIProviders(): Promise<HealthCheck> {
  try {
    const validation = validateAIProviders()
    const status = validation.valid.length > 0 ? 'ok' : 'down'

    return {
      name: 'ai_providers',
      status,
      details: {
        valid: validation.valid,
        invalid: validation.invalid,
        count: validation.valid.length,
      },
      message:
        validation.valid.length > 0
          ? `${validation.valid.length} provider(s) available`
          : 'No AI providers configured',
    }
  } catch (error) {
    return {
      name: 'ai_providers',
      status: 'down',
      message: error instanceof Error ? error.message : 'AI provider check failed',
    }
  }
}

async function checkRedis(): Promise<HealthCheck> {
  try {
    if (!process.env.REDIS_URL) {
      return {
        name: 'redis',
        status: 'ok',
        message: 'Redis not configured (using in-memory cache)',
      }
    }

    const { createClient } = await import('redis')
    const client = createClient({ url: process.env.REDIS_URL })

    const start = Date.now()
    await client.connect()
    await client.ping()
    await client.quit()

    return {
      name: 'redis',
      status: 'ok',
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      name: 'redis',
      status: 'degraded',
      message: error instanceof Error ? error.message : 'Redis connection failed',
    }
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const checks = await Promise.all([
      checkDatabase(),
      checkAIProviders(),
      checkRedis(),
    ])

    const hasDown = checks.some((c) => c.status === 'down')
    const hasDegraded = checks.some((c) => c.status === 'degraded')
    const overallStatus = hasDown ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy'

    const envInfo = getEnvironmentInfo()

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: envInfo,
      checks,
      responseTime: Date.now() - startTime,
      services: {
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      },
      { status: 503 }
    )
  }
}
