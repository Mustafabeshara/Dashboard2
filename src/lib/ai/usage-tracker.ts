/**
 * AI Usage Tracker
 * Tracks and logs AI API usage to the database for monitoring and cost analysis
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { PROVIDER_COSTS, AI_PROVIDERS } from './config'

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
  rateLimits?: RateLimitStatus[]
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

export interface RateLimitStatus {
  provider: string
  dailyLimit: number
  minuteLimit: number
  isEnabled: boolean
}

// Map provider display names to config keys for cost lookup
const PROVIDER_KEY_MAP: Record<string, string> = {
  'Groq': 'groq',
  'Gemini': 'gemini',
  'Google AI Studio': 'googleAI',
  'Claude (Anthropic)': 'anthropic',
}

/**
 * Calculate estimated cost for token usage
 * Uses centralized PROVIDER_COSTS from config.ts
 */
export function calculateCost(
  provider: string,
  promptTokens: number,
  completionTokens: number
): number {
  const providerKey = PROVIDER_KEY_MAP[provider] || provider.toLowerCase()
  const costs = PROVIDER_COSTS[providerKey] || { prompt: 0.0003, completion: 0.0006 }
  return (promptTokens / 1000) * costs.prompt + (completionTokens / 1000) * costs.completion
}

/**
 * Get rate limit configuration for all providers
 */
export function getRateLimitConfig(): RateLimitStatus[] {
  return Object.values(AI_PROVIDERS).map((provider) => ({
    provider: provider.name,
    dailyLimit: provider.rateLimitPerDay,
    minuteLimit: provider.rateLimitPerMinute,
    isEnabled: provider.isEnabled,
  }))
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

export interface UsageLogEntry {
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
}

export interface PaginatedLogs {
  logs: UsageLogEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Get recent AI usage logs with pagination
 */
export async function getRecentUsageLogs(
  limit: number = 50,
  offset: number = 0,
  userId?: string
): Promise<PaginatedLogs> {
  const whereClause = userId ? { userId } : undefined

  const [logs, total] = await Promise.all([
    prisma.aIUsageLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
    }),
    prisma.aIUsageLog.count({ where: whereClause }),
  ])

  return {
    logs,
    total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Get aggregated stats for a date range using efficient database queries
 */
async function getAggregatedStats(startDate: Date, endDate: Date): Promise<{
  requests: number
  tokens: number
  promptTokens: number
  completionTokens: number
}> {
  const result = await prisma.aIUsageLog.aggregate({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: { id: true },
    _sum: {
      totalTokens: true,
      promptTokens: true,
      completionTokens: true,
    },
  })

  return {
    requests: result._count.id || 0,
    tokens: result._sum.totalTokens || 0,
    promptTokens: result._sum.promptTokens || 0,
    completionTokens: result._sum.completionTokens || 0,
  }
}

/**
 * Get usage summary for quick display - optimized with database aggregation
 */
export async function getUsageSummary(): Promise<{
  today: { requests: number; tokens: number; cost: number }
  thisWeek: { requests: number; tokens: number; cost: number }
  thisMonth: { requests: number; tokens: number; cost: number }
  rateLimits: RateLimitStatus[]
}> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Use optimized aggregation queries instead of fetching all logs
  const [todayAgg, weekAgg, monthAgg] = await Promise.all([
    getAggregatedStats(todayStart, now),
    getAggregatedStats(weekStart, now),
    getAggregatedStats(monthStart, now),
  ])

  // Calculate average cost using default rates (actual cost calculation needs provider breakdown)
  const avgCostPerToken = 0.0004 / 1000 // Average cost per token

  return {
    today: {
      requests: todayAgg.requests,
      tokens: todayAgg.tokens,
      cost: Math.round(todayAgg.tokens * avgCostPerToken * 10000) / 10000,
    },
    thisWeek: {
      requests: weekAgg.requests,
      tokens: weekAgg.tokens,
      cost: Math.round(weekAgg.tokens * avgCostPerToken * 10000) / 10000,
    },
    thisMonth: {
      requests: monthAgg.requests,
      tokens: monthAgg.tokens,
      cost: Math.round(monthAgg.tokens * avgCostPerToken * 10000) / 10000,
    },
    rateLimits: getRateLimitConfig(),
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
