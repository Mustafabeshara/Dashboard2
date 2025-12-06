/**
 * Performance Monitoring System
 * Tracks database queries, API calls, and system metrics
 */

import { logger } from './logger'

// Metric types
export type MetricType = 'query' | 'api_call' | 'ai_request' | 'cache' | 'custom'

export interface Metric {
  type: MetricType
  name: string
  duration: number
  timestamp: Date
  success: boolean
  metadata?: Record<string, unknown>
}

export interface PerformanceStats {
  totalRequests: number
  averageDuration: number
  p50Duration: number
  p95Duration: number
  p99Duration: number
  successRate: number
  errorRate: number
}

// In-memory metrics store (last 1000 entries)
const MAX_METRICS = 1000
const metrics: Metric[] = []

// Threshold alerts (in milliseconds)
const THRESHOLDS = {
  query: { warning: 500, critical: 2000 },
  api_call: { warning: 1000, critical: 5000 },
  ai_request: { warning: 10000, critical: 30000 },
  cache: { warning: 50, critical: 200 },
  custom: { warning: 1000, critical: 5000 },
}

/**
 * Record a metric
 */
export function recordMetric(metric: Omit<Metric, 'timestamp'>): void {
  const fullMetric: Metric = {
    ...metric,
    timestamp: new Date(),
  }

  metrics.push(fullMetric)

  // Keep only last MAX_METRICS
  if (metrics.length > MAX_METRICS) {
    metrics.shift()
  }

  // Check thresholds and log warnings
  const threshold = THRESHOLDS[metric.type]
  if (metric.duration > threshold.critical) {
    logger.error(`Critical performance: ${metric.name}`, new Error('Performance threshold exceeded'), {
      context: {
        type: metric.type,
        duration: metric.duration,
        threshold: threshold.critical,
        metadata: metric.metadata,
      },
    })
  } else if (metric.duration > threshold.warning) {
    logger.warn(`Slow ${metric.type}: ${metric.name}`, {
      context: {
        duration: metric.duration,
        threshold: threshold.warning,
        metadata: metric.metadata,
      },
    })
  }
}

/**
 * Time an async operation and record metrics
 */
export async function timeAsync<T>(
  type: MetricType,
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = Date.now()
  let success = true

  try {
    const result = await operation()
    return result
  } catch (error) {
    success = false
    throw error
  } finally {
    recordMetric({
      type,
      name,
      duration: Date.now() - start,
      success,
      metadata,
    })
  }
}

/**
 * Time a sync operation and record metrics
 */
export function timeSync<T>(
  type: MetricType,
  name: string,
  operation: () => T,
  metadata?: Record<string, unknown>
): T {
  const start = Date.now()
  let success = true

  try {
    const result = operation()
    return result
  } catch (error) {
    success = false
    throw error
  } finally {
    recordMetric({
      type,
      name,
      duration: Date.now() - start,
      success,
      metadata,
    })
  }
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0
  const index = Math.ceil((p / 100) * sortedArray.length) - 1
  return sortedArray[Math.max(0, index)]
}

/**
 * Get performance statistics for a metric type
 */
export function getStats(type?: MetricType, since?: Date): PerformanceStats {
  let filtered = metrics

  if (type) {
    filtered = filtered.filter((m) => m.type === type)
  }

  if (since) {
    filtered = filtered.filter((m) => m.timestamp >= since)
  }

  if (filtered.length === 0) {
    return {
      totalRequests: 0,
      averageDuration: 0,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
      successRate: 0,
      errorRate: 0,
    }
  }

  const durations = filtered.map((m) => m.duration).sort((a, b) => a - b)
  const successCount = filtered.filter((m) => m.success).length

  return {
    totalRequests: filtered.length,
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50Duration: percentile(durations, 50),
    p95Duration: percentile(durations, 95),
    p99Duration: percentile(durations, 99),
    successRate: (successCount / filtered.length) * 100,
    errorRate: ((filtered.length - successCount) / filtered.length) * 100,
  }
}

/**
 * Get all stats grouped by type
 */
export function getAllStats(): Record<MetricType, PerformanceStats> {
  const types: MetricType[] = ['query', 'api_call', 'ai_request', 'cache', 'custom']
  const result: Partial<Record<MetricType, PerformanceStats>> = {}

  for (const type of types) {
    result[type] = getStats(type)
  }

  return result as Record<MetricType, PerformanceStats>
}

/**
 * Get recent slow queries/operations
 */
export function getSlowOperations(
  type?: MetricType,
  limit: number = 10
): Metric[] {
  let filtered = metrics

  if (type) {
    filtered = filtered.filter((m) => m.type === type)
  }

  return filtered
    .filter((m) => {
      const threshold = THRESHOLDS[m.type]
      return m.duration > threshold.warning
    })
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics(): void {
  metrics.length = 0
}

/**
 * Export metrics summary for monitoring
 */
export function exportMetricsSummary(): {
  stats: Record<MetricType, PerformanceStats>
  slowOperations: Metric[]
  totalMetrics: number
  oldestMetric?: Date
  newestMetric?: Date
} {
  return {
    stats: getAllStats(),
    slowOperations: getSlowOperations(undefined, 20),
    totalMetrics: metrics.length,
    oldestMetric: metrics[0]?.timestamp,
    newestMetric: metrics[metrics.length - 1]?.timestamp,
  }
}
