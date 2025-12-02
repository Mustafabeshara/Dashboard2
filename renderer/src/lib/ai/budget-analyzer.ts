/**
 * Budget Analysis AI Service
 * AI-powered budget forecasting, anomaly detection, and smart suggestions
 */

import { complete } from './ai-service-manager'

export interface BudgetData {
  id: string
  name: string
  totalAmount: number
  spentAmount: number
  categories: BudgetCategoryData[]
  historicalData?: HistoricalSpending[]
}

export interface BudgetCategoryData {
  id: string
  name: string
  allocatedAmount: number
  spentAmount: number
  type: 'REVENUE' | 'EXPENSE' | 'CAPITAL'
}

export interface HistoricalSpending {
  month: string // YYYY-MM format
  amount: number
  categoryId: string
}

export interface ForecastResult {
  success: boolean
  forecasts: CategoryForecast[]
  overallForecast: {
    predictedSpend: number
    variance: number
    confidence: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }
  warnings: string[]
  recommendations: string[]
  error?: string
}

export interface CategoryForecast {
  categoryId: string
  categoryName: string
  currentSpend: number
  predictedEndOfYearSpend: number
  allocatedAmount: number
  predictedVariance: number
  variancePercentage: number
  trend: 'over' | 'under' | 'on-track'
  confidence: number
}

export interface AnomalyResult {
  success: boolean
  anomalies: Anomaly[]
  riskScore: number
  recommendations: string[]
  error?: string
}

export interface Anomaly {
  type: 'spike' | 'unusual_pattern' | 'threshold_breach' | 'duplicate_risk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  categoryId?: string
  categoryName?: string
  description: string
  amount?: number
  expectedRange?: { min: number; max: number }
  suggestedAction: string
}

export interface SuggestionResult {
  success: boolean
  suggestions: BudgetSuggestion[]
  optimizationScore: number
  potentialSavings: number
  error?: string
}

export interface BudgetSuggestion {
  type: 'reallocation' | 'cost_reduction' | 'efficiency' | 'risk_mitigation'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  potentialImpact: number
  affectedCategories: string[]
  implementation: string[]
}

const FORECAST_PROMPT = `You are a financial analyst AI specializing in budget forecasting for medical distribution companies.

Analyze the following budget data and provide forecasts:
- Current budget allocation and spending
- Historical spending patterns (if available)
- Industry context: Medical equipment distribution in Kuwait

Return a JSON response with:
{
  "forecasts": [
    {
      "categoryId": "string",
      "categoryName": "string",
      "currentSpend": number,
      "predictedEndOfYearSpend": number,
      "predictedVariance": number (positive = over budget),
      "variancePercentage": number,
      "trend": "over" | "under" | "on-track",
      "confidence": number (0-100)
    }
  ],
  "overallForecast": {
    "predictedSpend": number,
    "variance": number,
    "confidence": number,
    "trend": "increasing" | "decreasing" | "stable"
  },
  "warnings": ["string - important warnings"],
  "recommendations": ["string - actionable recommendations"]
}

Consider:
- Seasonality in medical equipment purchasing
- Kuwait fiscal year patterns
- Government tender cycles
- End-of-year budget utilization patterns`

const ANOMALY_PROMPT = `You are a financial auditor AI specializing in detecting budget anomalies and potential fraud.

Analyze the following budget and transaction data for anomalies:
- Unusual spending patterns
- Threshold breaches
- Potential duplicate transactions
- Irregular timing patterns

Return a JSON response with:
{
  "anomalies": [
    {
      "type": "spike" | "unusual_pattern" | "threshold_breach" | "duplicate_risk",
      "severity": "low" | "medium" | "high" | "critical",
      "categoryId": "string (optional)",
      "categoryName": "string (optional)",
      "description": "string - detailed description",
      "amount": number (optional),
      "expectedRange": { "min": number, "max": number } (optional),
      "suggestedAction": "string"
    }
  ],
  "riskScore": number (0-100, higher = more risk),
  "recommendations": ["string - recommended actions"]
}

Flag patterns that might indicate:
- Budget manipulation
- Unauthorized spending
- Inefficient allocation
- End-of-year rush spending`

const SUGGESTION_PROMPT = `You are a financial optimization AI for medical distribution companies.

Based on the budget data provided, suggest optimizations:
- Reallocation opportunities
- Cost reduction areas
- Efficiency improvements
- Risk mitigation strategies

Return a JSON response with:
{
  "suggestions": [
    {
      "type": "reallocation" | "cost_reduction" | "efficiency" | "risk_mitigation",
      "priority": "low" | "medium" | "high",
      "title": "string - brief title",
      "description": "string - detailed description",
      "potentialImpact": number (estimated KWD savings/improvement),
      "affectedCategories": ["category names"],
      "implementation": ["step 1", "step 2", "..."]
    }
  ],
  "optimizationScore": number (0-100, how optimized current budget is),
  "potentialSavings": number (total potential KWD savings)
}

Consider Kuwait market specifics:
- Government tender requirements
- Medical equipment depreciation
- Currency considerations (KWD/USD)
- Supplier relationship optimization`

/**
 * Generate budget forecasts using AI
 */
export async function generateBudgetForecast(
  budget: BudgetData
): Promise<ForecastResult> {
  const prompt = `${FORECAST_PROMPT}

Budget Data:
- Name: ${budget.name}
- Total Allocated: ${budget.totalAmount} KWD
- Total Spent: ${budget.spentAmount} KWD
- Utilization: ${((budget.spentAmount / budget.totalAmount) * 100).toFixed(1)}%

Categories:
${budget.categories.map((c) => `
- ${c.name}:
  - Type: ${c.type}
  - Allocated: ${c.allocatedAmount} KWD
  - Spent: ${c.spentAmount} KWD
  - Utilization: ${((c.spentAmount / c.allocatedAmount) * 100).toFixed(1)}%
`).join('')}

${budget.historicalData ? `
Historical Spending (Last 12 months):
${budget.historicalData.map((h) => `- ${h.month}: ${h.amount} KWD`).join('\n')}
` : 'No historical data available.'}

Current Month: ${new Date().toISOString().slice(0, 7)}
Remaining Months in Year: ${12 - new Date().getMonth()}

Provide the forecast in JSON format only.`

  const response = await complete({
    prompt,
    systemPrompt: 'You are a financial forecasting AI. Return only valid JSON.',
    taskType: 'complexAnalysis',
    temperature: 0.2,
  })

  if (!response.success) {
    return {
      success: false,
      forecasts: [],
      overallForecast: {
        predictedSpend: 0,
        variance: 0,
        confidence: 0,
        trend: 'stable',
      },
      warnings: [],
      recommendations: [],
      error: response.error,
    }
  }

  try {
    let jsonString = response.content.trim()
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```$/g, '')
    }
    const result = JSON.parse(jsonString)
    return { success: true, ...result }
  } catch {
    return {
      success: false,
      forecasts: [],
      overallForecast: {
        predictedSpend: 0,
        variance: 0,
        confidence: 0,
        trend: 'stable',
      },
      warnings: [],
      recommendations: [],
      error: 'Failed to parse forecast response',
    }
  }
}

/**
 * Detect budget anomalies using AI
 */
export async function detectBudgetAnomalies(
  budget: BudgetData,
  recentTransactions?: Array<{
    date: string
    amount: number
    description: string
    categoryName: string
  }>
): Promise<AnomalyResult> {
  const prompt = `${ANOMALY_PROMPT}

Budget Data:
- Name: ${budget.name}
- Total: ${budget.totalAmount} KWD
- Spent: ${budget.spentAmount} KWD

Categories:
${budget.categories.map((c) => `
- ${c.name}: Spent ${c.spentAmount} of ${c.allocatedAmount} KWD (${((c.spentAmount / c.allocatedAmount) * 100).toFixed(1)}%)
`).join('')}

${recentTransactions ? `
Recent Transactions (Last 30 days):
${recentTransactions.map((t) => `- ${t.date}: ${t.amount} KWD - ${t.description} (${t.categoryName})`).join('\n')}
` : ''}

Analyze for anomalies and return JSON only.`

  const response = await complete({
    prompt,
    systemPrompt: 'You are a financial auditing AI. Return only valid JSON.',
    taskType: 'complexAnalysis',
    temperature: 0.1,
  })

  if (!response.success) {
    return {
      success: false,
      anomalies: [],
      riskScore: 0,
      recommendations: [],
      error: response.error,
    }
  }

  try {
    let jsonString = response.content.trim()
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```$/g, '')
    }
    const result = JSON.parse(jsonString)
    return { success: true, ...result }
  } catch {
    return {
      success: false,
      anomalies: [],
      riskScore: 0,
      recommendations: [],
      error: 'Failed to parse anomaly response',
    }
  }
}

/**
 * Generate budget optimization suggestions using AI
 */
export async function generateBudgetSuggestions(
  budget: BudgetData
): Promise<SuggestionResult> {
  const prompt = `${SUGGESTION_PROMPT}

Budget Data:
- Name: ${budget.name}
- Total Allocated: ${budget.totalAmount} KWD
- Total Spent: ${budget.spentAmount} KWD
- Remaining: ${budget.totalAmount - budget.spentAmount} KWD

Categories (sorted by utilization):
${budget.categories
  .map((c) => ({
    ...c,
    utilization: (c.spentAmount / c.allocatedAmount) * 100,
  }))
  .sort((a, b) => b.utilization - a.utilization)
  .map((c) => `
- ${c.name} (${c.type}):
  - Allocated: ${c.allocatedAmount} KWD
  - Spent: ${c.spentAmount} KWD
  - Utilization: ${c.utilization.toFixed(1)}%
  - Remaining: ${c.allocatedAmount - c.spentAmount} KWD
`).join('')}

Industry Context: Medical device distribution company in Kuwait, primarily government contracts (MOH).

Provide optimization suggestions in JSON format only.`

  const response = await complete({
    prompt,
    systemPrompt: 'You are a financial optimization AI. Return only valid JSON.',
    taskType: 'complexAnalysis',
    temperature: 0.3,
  })

  if (!response.success) {
    return {
      success: false,
      suggestions: [],
      optimizationScore: 0,
      potentialSavings: 0,
      error: response.error,
    }
  }

  try {
    let jsonString = response.content.trim()
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```$/g, '')
    }
    const result = JSON.parse(jsonString)
    return { success: true, ...result }
  } catch {
    return {
      success: false,
      suggestions: [],
      optimizationScore: 0,
      potentialSavings: 0,
      error: 'Failed to parse suggestions response',
    }
  }
}

/**
 * Auto-categorize an expense description
 */
export async function categorizeExpense(
  description: string,
  availableCategories: string[]
): Promise<{ category: string; confidence: number }> {
  const prompt = `Categorize the following expense into one of the available categories.

Expense: "${description}"

Available Categories:
${availableCategories.map((c) => `- ${c}`).join('\n')}

Return JSON: { "category": "exact category name from list", "confidence": 0-100 }
Return only JSON, no explanation.`

  const response = await complete({
    prompt,
    systemPrompt: 'You are an expense categorization AI. Return only valid JSON.',
    taskType: 'summarization',
    temperature: 0,
  })

  if (!response.success) {
    return { category: availableCategories[0], confidence: 0 }
  }

  try {
    let jsonString = response.content.trim()
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```json?\n?/g, '').replace(/```$/g, '')
    }
    return JSON.parse(jsonString)
  } catch {
    return { category: availableCategories[0], confidence: 0 }
  }
}

/**
 * Generate natural language budget summary
 */
export async function generateBudgetSummary(
  budget: BudgetData
): Promise<string> {
  const utilization = (budget.spentAmount / budget.totalAmount) * 100

  const prompt = `Generate a brief (2-3 sentences) executive summary of this budget status for a CEO dashboard.

Budget: ${budget.name}
Allocated: ${budget.totalAmount.toLocaleString()} KWD
Spent: ${budget.spentAmount.toLocaleString()} KWD
Utilization: ${utilization.toFixed(1)}%
Categories: ${budget.categories.length}

Key concerns:
${budget.categories
  .filter((c) => (c.spentAmount / c.allocatedAmount) > 0.9)
  .map((c) => `- ${c.name} at ${((c.spentAmount / c.allocatedAmount) * 100).toFixed(0)}% utilization`)
  .join('\n') || 'None'}

Return only the summary text, no JSON.`

  const response = await complete({
    prompt,
    systemPrompt: 'You are a financial summary writer. Be concise and professional.',
    taskType: 'summarization',
    temperature: 0.5,
  })

  if (!response.success) {
    return `Budget ${budget.name} is at ${utilization.toFixed(1)}% utilization with ${budget.spentAmount.toLocaleString()} KWD spent of ${budget.totalAmount.toLocaleString()} KWD allocated.`
  }

  return response.content.trim()
}
