/**
 * AI Usage API Endpoint
 * Provides AI usage statistics, logs, and summaries
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUsageStats,
  getRecentUsageLogs,
  getUsageSummary,
  cleanupOldLogs,
} from '@/lib/ai/usage-tracker'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Query parameters schema
const querySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'custom']).optional().default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  action: z.enum(['stats', 'logs', 'summary', 'cleanup']).optional().default('stats'),
  limit: z.coerce.number().min(1).max(500).optional().default(50),
})

/**
 * GET /api/ai/usage
 * Get AI usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const params = querySchema.parse(searchParams)

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (params.period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'custom':
        if (!params.startDate || !params.endDate) {
          return NextResponse.json(
            { success: false, error: 'Custom period requires startDate and endDate' },
            { status: 400 }
          )
        }
        startDate = new Date(params.startDate)
        endDate = new Date(params.endDate)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Handle different actions
    switch (params.action) {
      case 'summary': {
        const summary = await getUsageSummary()
        return NextResponse.json({
          success: true,
          data: summary,
        })
      }

      case 'logs': {
        const logs = await getRecentUsageLogs(params.limit)
        return NextResponse.json({
          success: true,
          data: {
            logs,
            count: logs.length,
          },
        })
      }

      case 'cleanup': {
        // Only allow admins to cleanup
        const userRole = (session.user as { role?: string }).role
        if (userRole !== 'ADMIN') {
          return NextResponse.json(
            { success: false, error: 'Admin access required' },
            { status: 403 }
          )
        }
        const deleted = await cleanupOldLogs(90)
        return NextResponse.json({
          success: true,
          data: { deletedCount: deleted },
        })
      }

      case 'stats':
      default: {
        const stats = await getUsageStats(startDate, endDate)
        return NextResponse.json({
          success: true,
          data: {
            period: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
            stats,
          },
        })
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('AI usage API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
