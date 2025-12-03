/**
 * AI Usage Tracker
 * Tracks and logs AI API usage to the database for monitoring and cost analysis
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface AIUsageData {
  provider: string
  model: string
  endpoint: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
  success: boolean
  errorMessage?: string
  taskType?: string
  userId?: string
}

export interface UsageStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalTokens: number
  totalPromptTokens: number
  totalCompletionTokens: number
  averageLatencyMs: number
  byProvider: ProviderStats[]
  byTaskType: TaskTypeStats[]
  dailyUsage: DailyUsageStats[]
  estimatedCost: number
}

export interface ProviderStats {
  provider: string
  model: string
  requestCount: number
  successCount: number
  totalTokens: number
  averageLatencyMs: number
  estimatedCost: number
}

export interface TaskTypeStats {
  taskType: string
  requestCount: number
  successCount: number
  totalTokens: number
  averageLatencyMs: number
}

export interface DailyUsageStats {
  date: string
  requestCount: number
  totalTokens: number
  successRate: number
}

// Cost per 1000 tokens (approximate)
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'Groq': { input: 0.0001, output: 0.0002 },
  'Gemini': { input: 0.00025, output: 0.0005 },
  'Google AI Studio': { input: 0.00025, output: 0.0005 },
  'Claude (Anthropic)': { input: 0.00025, output: 0.00125 },
}

/**
 * Calculate estimated cost for token usage
 */
export function calculateCost(
  provider: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = TOKEN_COSTS[provider] || { input: 0.0003, output: 0.0006 }
  return (promptTokens / 1000) * costs.input + (completionTokens / 1000) * costs.output
}

/**
 * Track AI usage in the database
 */
export async function trackAIUsage(data: AIUsageData): Promise<void> {
  try {
    await prisma.aIUsageLog.create({
      data: {
        provider: data.provider,
        model: data.model,
        endpoint: data.endpoint,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        latencyMs: data.latencyMs,
        success: data.success,
        errorMessage: data.errorMessage,
        taskType: data.taskType,
        userId: data.userId,
      },
    })

    logger.info('AI usage tracked', {
      context: {
        provider: data.provider,
        model: data.model,
        tokens: data.totalTokens,
        latency: data.latencyMs,
        success: data.success,
      },
    })
  } catch (error) {
    logger.error('Failed to track AI usage', error as Error)
  }
}

/**
 * Get AI usage statistics for a time period
 */
export async function getUsageStats(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<UsageStats> {
  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    ...(userId && { userId }),
  }

  // Get all logs for the period
  const logs = await prisma.aIUsageLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  })

  // Calculate totals
  const totalRequests = logs.length
  const successfulRequests = logs.filter((l) => l.success).length
  const failedRequests = totalRequests - successfulRequests
  const totalTokens = logs.reduce((sum, l) => sum + l.totalTokens, 0)
  const totalPromptTokens = logs.reduce((sum, l) => sum + l.promptTokens, 0)
  const totalCompletionTokens = logs.reduce((sum, l) => sum + l.completionTokens, 0)
  const averageLatencyMs =
    totalRequests > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.latencyMs, 0) / totalRequests)
      : 0

  // Calculate estimated total cost
  const estimatedCost = logs.reduce(
    (sum, l) => sum + calculateCost(l.provider, l.promptTokens, l.completionTokens),
    0
  )

  // Group by provider
  const providerMap = new Map<string, ProviderStats>()
  for (const log of logs) {
    const key = `${log.provider}:${log.model}`
    const existing = providerMap.get(key)
    if (existing) {
      existing.requestCount++
      if (log.success) existing.successCount++
      existing.totalTokens += log.totalTokens
      existing.averageLatencyMs =
        (existing.averageLatencyMs * (existing.requestCount - 1) + log.latencyMs) /
        existing.requestCount
      existing.estimatedCost += calculateCost(log.provider, log.promptTokens, log.completionTokens)
    } else {
      providerMap.set(key, {
        provider: log.provider,
        model: log.model,
        requestCount: 1,
        successCount: log.success ? 1 : 0,
        totalTokens: log.totalTokens,
        averageLatencyMs: log.latencyMs,
        estimatedCost: calculateCost(log.provider, log.promptTokens, log.completionTokens),
      })
    }
  }

  // Group by task type
  const taskTypeMap = new Map<string, TaskTypeStats>()
  for (const log of logs) {
    const taskType = log.taskType || 'general'
    const existing = taskTypeMap.get(taskType)
    if (existing) {
      existing.requestCount++
      if (log.success) existing.successCount++
      existing.totalTokens += log.totalTokens
      existing.averageLatencyMs =
        (existing.averageLatencyMs * (existing.requestCount - 1) + log.latencyMs) /
        existing.requestCount
    } else {
      taskTypeMap.set(taskType, {
        taskType,
        requestCount: 1,
        successCount: log.success ? 1 : 0,
        totalTokens: log.totalTokens,
        averageLatencyMs: log.latencyMs,
      })
    }
  }

  // Group by day
  const dailyMap = new Map<string, { count: number; tokens: number; success: number }>()
  for (const log of logs) {
    const date = log.createdAt.toISOString().split('T')[0]
    const existing = dailyMap.get(date)
    if (existing) {
      existing.count++
      existing.tokens += log.totalTokens
      if (log.success) existing.success++
    } else {
      dailyMap.set(date, {
        count: 1,
        tokens: log.totalTokens,
        success: log.success ? 1 : 0,
      })
    }
  }

  const dailyUsage: DailyUsageStats[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      requestCount: data.count,
      totalTokens: data.tokens,
      successRate: data.count > 0 ? Math.round((data.success / data.count) * 100) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    totalTokens,
    totalPromptTokens,
    totalCompletionTokens,
    averageLatencyMs,
    byProvider: Array.from(providerMap.values()).sort((a, b) => b.requestCount - a.requestCount),
    byTaskType: Array.from(taskTypeMap.values()).sort((a, b) => b.requestCount - a.requestCount),
    dailyUsage,
    estimatedCost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimal places
  }
}

/**
 * Get recent AI usage logs
 */
export async function getRecentUsageLogs(
  limit: number = 50,
  userId?: string
): Promise<{
  id: string
  provider: string
  model: string
  endpoint: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number
  success: boolean
  errorMessage: string | null
  taskType: string | null
  createdAt: Date
}[]> {
  return prisma.aIUsageLog.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      provider: true,
      model: true,
      endpoint: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      latencyMs: true,
      success: true,
      errorMessage: true,
      taskType: true,
      createdAt: true,
    },
  })
}

/**
 * Get usage summary for quick display
 */
export async function getUsageSummary(): Promise<{
  today: { requests: number; tokens: number; cost: number }
  thisWeek: { requests: number; tokens: number; cost: number }
  thisMonth: { requests: number; tokens: number; cost: number }
}> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [todayStats, weekStats, monthStats] = await Promise.all([
    getUsageStats(todayStart, now),
    getUsageStats(weekStart, now),
    getUsageStats(monthStart, now),
  ])

  return {
    today: {
      requests: todayStats.totalRequests,
      tokens: todayStats.totalTokens,
      cost: todayStats.estimatedCost,
    },
    thisWeek: {
      requests: weekStats.totalRequests,
      tokens: weekStats.totalTokens,
      cost: weekStats.estimatedCost,
    },
    thisMonth: {
      requests: monthStats.totalRequests,
      tokens: monthStats.totalTokens,
      cost: monthStats.estimatedCost,
    },
  }
}

/**
 * Clean up old usage logs (older than specified days)
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const result = await prisma.aIUsageLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  })

  logger.info(`Cleaned up ${result.count} old AI usage logs`)
  return result.count
}
