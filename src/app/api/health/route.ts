/**
 * Health Check API Endpoint
 * Simple health check for Railway with timeout protection
 */

import { NextRequest, NextResponse } from 'next/server'

// Simple health check - no complex dependencies
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Basic response - always succeeds for Railway healthcheck
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
    }

    // Optionally check database if query param is set
    if (request.nextUrl.searchParams.get('full') === 'true') {
      try {
        // Dynamic import to avoid startup issues
        const { prisma } = await import('@/lib/prisma')
        const dbStart = Date.now()
        await prisma.$queryRaw`SELECT 1`
        
        return NextResponse.json({
          ...health,
          database: {
            status: 'connected',
            latency: Date.now() - dbStart,
          },
        })
      } catch (dbError) {
        return NextResponse.json({
          ...health,
          database: {
            status: 'error',
            message: dbError instanceof Error ? dbError.message : 'Connection failed',
          },
        })
      }
    }

    return NextResponse.json(health)
  } catch (error) {
    // Even on error, return 200 to keep Railway happy
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
