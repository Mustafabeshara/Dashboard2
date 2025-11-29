/**
 * AI Budget Insights Component
 * Displays AI-generated forecasts, anomalies, and suggestions
 */

'use client'

import { useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Shield,
  Zap,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency } from '@/lib/utils'

interface BudgetInsightsProps {
  budgetId: string
  budgetName: string
  totalAmount: number
  spentAmount: number
}

interface ForecastData {
  predictedSpend: number
  variance: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
  warnings: string[]
  recommendations: string[]
}

interface AnomalyData {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggestedAction: string
}

interface SuggestionData {
  type: string
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  potentialImpact: number
}

export function AIBudgetInsights({
  budgetId,
  budgetName,
  totalAmount,
  spentAmount,
}: BudgetInsightsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'forecast' | 'anomalies' | 'suggestions'>('forecast')

  // Demo data - in production, this would come from the AI service
  const [forecast] = useState<ForecastData>({
    predictedSpend: totalAmount * 0.92,
    variance: -totalAmount * 0.08,
    confidence: 85,
    trend: 'stable',
    warnings: [
      'Marketing category trending 15% over budget',
      'Q4 typically sees 20% increase in equipment purchases',
    ],
    recommendations: [
      'Consider reallocating 5% from IT to Medical Equipment',
      'Review pending tenders for potential savings',
      'Negotiate bulk pricing with top 3 suppliers',
    ],
  })

  const [anomalies] = useState<AnomalyData[]>([
    {
      type: 'spike',
      severity: 'medium',
      description: 'Unusual 40% spike in office supplies spending this month compared to 3-month average',
      suggestedAction: 'Review recent purchase orders for office supplies',
    },
    {
      type: 'threshold_breach',
      severity: 'high',
      description: 'Marketing budget at 92% utilization with 3 months remaining',
      suggestedAction: 'Request budget reallocation or reduce planned marketing activities',
    },
  ])

  const [suggestions] = useState<SuggestionData[]>([
    {
      type: 'reallocation',
      priority: 'high',
      title: 'Reallocate Underutilized IT Budget',
      description: 'IT budget is at 45% utilization. Consider reallocating 50,000 KWD to Medical Equipment.',
      potentialImpact: 50000,
    },
    {
      type: 'cost_reduction',
      priority: 'medium',
      title: 'Consolidate Supplier Contracts',
      description: 'Analysis shows 3 similar suppliers for medical supplies. Consolidating could yield 8% savings.',
      potentialImpact: 24000,
    },
    {
      type: 'efficiency',
      priority: 'low',
      title: 'Automate Recurring Purchases',
      description: 'Set up automatic reorders for consumables to reduce admin overhead and get bulk discounts.',
      potentialImpact: 12000,
    },
  ])

  const refreshInsights = async () => {
    setIsLoading(true)
    // In production, call the AI service
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsLoading(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-green-100 text-green-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reallocation':
        return <Target className="h-4 w-4" />
      case 'cost_reduction':
        return <TrendingDown className="h-4 w-4" />
      case 'efficiency':
        return <Zap className="h-4 w-4" />
      case 'risk_mitigation':
        return <Shield className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshInsights}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          AI-powered analysis and recommendations for {budgetName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'forecast'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('forecast')}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Forecast
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'anomalies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('anomalies')}
          >
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Anomalies
            {anomalies.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {anomalies.length}
              </Badge>
            )}
          </button>
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'suggestions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('suggestions')}
          >
            <Lightbulb className="h-4 w-4 inline mr-2" />
            Suggestions
          </button>
        </div>

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="space-y-4">
            {/* Prediction Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Predicted Year-End Spend</p>
                <p className="text-xl font-bold">
                  {formatCurrency(forecast.predictedSpend)}
                </p>
                <div className="flex items-center mt-1">
                  {forecast.trend === 'increasing' ? (
                    <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                  ) : forecast.trend === 'decreasing' ? (
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  ) : null}
                  <span className="text-sm text-gray-500">{forecast.trend}</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Predicted Variance</p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    forecast.variance >= 0 ? 'text-red-600' : 'text-green-600'
                  )}
                >
                  {forecast.variance >= 0 ? '+' : ''}
                  {formatCurrency(forecast.variance)}
                </p>
                <p className="text-sm text-gray-500">
                  {forecast.variance >= 0 ? 'Over budget' : 'Under budget'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Confidence Level</p>
                <p className="text-xl font-bold">{forecast.confidence}%</p>
                <Progress value={forecast.confidence} className="h-2 mt-2" />
              </div>
            </div>

            {/* Warnings */}
            {forecast.warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Warnings</h4>
                <div className="space-y-2">
                  {forecast.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <span className="text-sm text-yellow-800">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {forecast.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  AI Recommendations
                </h4>
                <div className="space-y-2">
                  {forecast.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5" />
                      <span className="text-sm text-blue-800">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Anomalies Tab */}
        {activeTab === 'anomalies' && (
          <div className="space-y-4">
            {anomalies.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Anomalies Detected</h3>
                <p className="text-gray-500">
                  Your budget spending patterns look normal
                </p>
              </div>
            ) : (
              anomalies.map((anomaly, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-4 border rounded-lg',
                    getSeverityColor(anomaly.severity)
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              'text-xs',
                              getSeverityColor(anomaly.severity)
                            )}
                          >
                            {anomaly.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {anomaly.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-1 font-medium">{anomaly.description}</p>
                        <p className="mt-2 text-sm">
                          <strong>Suggested Action:</strong> {anomaly.suggestedAction}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            {/* Total Potential Savings */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Total Potential Savings</p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(
                      suggestions.reduce((sum, s) => sum + s.potentialImpact, 0)
                    )}
                  </p>
                </div>
                <Sparkles className="h-8 w-8 text-green-500" />
              </div>
            </div>

            {/* Suggestions List */}
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded">
                      {getTypeIcon(suggestion.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{suggestion.title}</h4>
                        <Badge className={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-green-600 font-medium">
                          Potential: {formatCurrency(suggestion.potentialImpact)}
                        </span>
                        <Button variant="outline" size="sm">
                          Apply
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
