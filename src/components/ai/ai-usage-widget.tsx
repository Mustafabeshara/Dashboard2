/**
 * AI Usage Dashboard Widget
 * Displays AI usage statistics, costs, and provider breakdown
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  Cpu,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  Zap,
  BarChart3,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface RateLimitStatus {
  provider: string
  dailyLimit: number
  minuteLimit: number
  isEnabled: boolean
}

interface UsageSummary {
  today: { requests: number; tokens: number; cost: number }
  thisWeek: { requests: number; tokens: number; cost: number }
  thisMonth: { requests: number; tokens: number; cost: number }
  rateLimits?: RateLimitStatus[]
}

interface ProviderStats {
  provider: string
  model: string
  requestCount: number
  successCount: number
  totalTokens: number
  averageLatencyMs: number
  estimatedCost: number
}

interface TaskTypeStats {
  taskType: string
  requestCount: number
  successCount: number
  totalTokens: number
  averageLatencyMs: number
}

interface DailyUsageStats {
  date: string
  requestCount: number
  totalTokens: number
  successRate: number
}

interface UsageStats {
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

interface RecentLog {
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
  createdAt: string
}

type TabType = 'overview' | 'providers' | 'activity'

export function AIUsageWidget() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [summaryRes, statsRes, logsRes] = await Promise.all([
        fetch('/api/ai/usage?action=summary'),
        fetch('/api/ai/usage?action=stats&period=month'),
        fetch('/api/ai/usage?action=logs&limit=10'),
      ])

      if (!summaryRes.ok || !statsRes.ok || !logsRes.ok) {
        throw new Error('Failed to fetch AI usage data')
      }

      const [summaryData, statsData, logsData] = await Promise.all([
        summaryRes.json(),
        statsRes.json(),
        logsRes.json(),
      ])

      if (summaryData.success) setSummary(summaryData.data)
      if (statsData.success) setStats(statsData.data.stats)
      if (logsData.success) setRecentLogs(logsData.data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens.toString()
  }

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`
  }

  const formatLatency = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${ms}ms`
  }

  const getProviderColor = (provider: string): string => {
    switch (provider) {
      case 'Groq':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'Gemini':
      case 'Google AI Studio':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Claude (Anthropic)':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const successRate = stats
    ? Math.round((stats.successfulRequests / Math.max(stats.totalRequests, 1)) * 100)
    : 0

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Usage</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
          <Button variant="outline" onClick={fetchData} className="w-full mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Usage</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Monitor AI API usage, costs, and performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Overview
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'providers'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('providers')}
          >
            <Zap className="h-4 w-4 inline mr-2" />
            Providers
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'activity'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('activity')}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Activity
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && summary && stats && (
              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                      <Activity className="h-4 w-4" />
                      <span className="text-xs font-medium">Today</span>
                    </div>
                    <p className="text-lg font-bold">{summary.today.requests}</p>
                    <p className="text-xs text-gray-500">requests</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium">This Month</span>
                    </div>
                    <p className="text-lg font-bold">{stats.totalRequests}</p>
                    <p className="text-xs text-gray-500">requests</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <Cpu className="h-4 w-4" />
                      <span className="text-xs font-medium">Tokens</span>
                    </div>
                    <p className="text-lg font-bold">{formatTokens(stats.totalTokens)}</p>
                    <p className="text-xs text-gray-500">total used</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs font-medium">Est. Cost</span>
                    </div>
                    <p className="text-lg font-bold">{formatCost(stats.estimatedCost)}</p>
                    <p className="text-xs text-gray-500">this month</p>
                  </div>
                </div>

                {/* Success Rate & Latency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Success Rate</span>
                      <Badge
                        className={cn(
                          successRate >= 95
                            ? 'bg-green-100 text-green-700'
                            : successRate >= 80
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        {successRate}%
                      </Badge>
                    </div>
                    <Progress value={successRate} className="h-2" />
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {stats.successfulRequests} success
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        {stats.failedRequests} failed
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Avg. Latency</span>
                      <Badge className="bg-blue-100 text-blue-700">
                        {formatLatency(stats.averageLatencyMs)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${Math.min((stats.averageLatencyMs / 5000) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">5s max</span>
                    </div>
                  </div>
                </div>

                {/* Token Breakdown */}
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Token Usage Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Prompt Tokens</span>
                      <span className="font-medium">{formatTokens(stats.totalPromptTokens)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${(stats.totalPromptTokens / Math.max(stats.totalTokens, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Completion Tokens</span>
                      <span className="font-medium">{formatTokens(stats.totalCompletionTokens)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(stats.totalCompletionTokens / Math.max(stats.totalTokens, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Daily Usage Chart */}
                {stats.dailyUsage.length > 0 && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-sm font-medium mb-3">Daily Usage (Last 7 Days)</h4>
                    <div className="flex items-end gap-1 h-24">
                      {stats.dailyUsage.slice(-7).map((day, idx) => {
                        const maxRequests = Math.max(...stats.dailyUsage.slice(-7).map(d => d.requestCount), 1)
                        const height = (day.requestCount / maxRequests) * 100
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-purple-500 rounded-t transition-all"
                              style={{ height: `${Math.max(height, 4)}%` }}
                              title={`${day.date}: ${day.requestCount} requests, ${formatTokens(day.totalTokens)} tokens`}
                            />
                            <span className="text-[10px] text-gray-400">
                              {new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>
                        {stats.dailyUsage.length > 0 && new Date(stats.dailyUsage[Math.max(0, stats.dailyUsage.length - 7)].date).toLocaleDateString()}
                      </span>
                      <span>
                        {stats.dailyUsage.length > 0 && new Date(stats.dailyUsage[stats.dailyUsage.length - 1].date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Rate Limits */}
                {summary.rateLimits && summary.rateLimits.length > 0 && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-sm font-medium mb-3">Provider Rate Limits</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {summary.rateLimits.filter(r => r.isEnabled).map((limit, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={getProviderColor(limit.provider)} variant="outline">
                              {limit.provider}
                            </Badge>
                          </div>
                          <div className="text-gray-500">
                            <span>{limit.minuteLimit}/min</span>
                            <span className="mx-1">|</span>
                            <span>{limit.dailyLimit.toLocaleString()}/day</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && stats && (
              <div className="space-y-4">
                {stats.byProvider.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No provider data available</p>
                  </div>
                ) : (
                  stats.byProvider.map((provider, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getProviderColor(provider.provider)}>
                            {provider.provider}
                          </Badge>
                          <span className="text-sm text-gray-500">{provider.model}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {provider.requestCount} requests
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Success</p>
                          <p className="font-medium">
                            {Math.round((provider.successCount / Math.max(provider.requestCount, 1)) * 100)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tokens</p>
                          <p className="font-medium">{formatTokens(provider.totalTokens)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Avg. Latency</p>
                          <p className="font-medium">{formatLatency(Math.round(provider.averageLatencyMs))}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Est. Cost</p>
                          <p className="font-medium">{formatCost(provider.estimatedCost)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Task Type Breakdown */}
                {stats.byTaskType.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">By Task Type</h4>
                    <div className="space-y-2">
                      {stats.byTaskType.map((task, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium capitalize">
                              {task.taskType.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {task.requestCount}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatTokens(task.totalTokens)} tokens
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-3">
                {recentLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'p-3 border rounded-lg',
                        log.success ? 'border-gray-200' : 'border-red-200 bg-red-50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {log.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Badge className={getProviderColor(log.provider)}>
                            {log.provider}
                          </Badge>
                          {log.taskType && (
                            <span className="text-xs text-gray-500 capitalize">
                              {log.taskType}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{log.totalTokens} tokens</span>
                        <span>{formatLatency(log.latencyMs)}</span>
                        <span className="truncate flex-1">{log.endpoint}</span>
                      </div>
                      {!log.success && log.errorMessage && (
                        <p className="mt-2 text-xs text-red-600 truncate">
                          {log.errorMessage}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
