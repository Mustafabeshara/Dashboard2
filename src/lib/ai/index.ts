/**
 * AI Module Index
 * Exports all AI services for easy imports
 */

// Core AI Service
export {
  complete,
  extractFromDocument,
  summarize,
  translateArabicToEnglish,
  getRateLimitStatus,
} from './ai-service-manager'
export type { AIRequest, AIResponse } from './ai-service-manager'

// AI Configuration
export {
  AI_CONFIG,
  AI_PROVIDERS,
  TASK_MODELS,
  EXTRACTION_PROMPTS,
  ARABIC_FIELD_MAPPING,
} from './config'
export type { AIProviderConfig, AIServiceConfig } from './config'

// Tender Extraction
export {
  extractTenderData,
  extractTenderProducts,
  translateArabicFields,
  mapExtractedToTenderForm,
} from './tender-extractor'
export type {
  TenderExtractedData,
  TenderProduct,
  ExtractionResult,
} from './tender-extractor'

// Budget Analysis
export {
  generateBudgetForecast,
  detectBudgetAnomalies,
  generateBudgetSuggestions,
  categorizeExpense,
  generateBudgetSummary,
} from './budget-analyzer'
export type {
  BudgetData,
  BudgetCategoryData,
  HistoricalSpending,
  ForecastResult,
  CategoryForecast,
  AnomalyResult,
  Anomaly,
  SuggestionResult,
  BudgetSuggestion,
} from './budget-analyzer'

// AI Usage Tracking
export {
  trackAIUsage,
  getUsageStats,
  getRecentUsageLogs,
  getUsageSummary,
  cleanupOldLogs,
  calculateCost,
  getRateLimitConfig,
} from './usage-tracker'
export type {
  AIUsageData,
  UsageStats,
  ProviderStats,
  TaskTypeStats,
  DailyUsageStats,
  RateLimitStatus,
  UsageLogEntry,
  PaginatedLogs,
} from './usage-tracker'

// Product Matching
export {
  findMatchingProducts,
  compareAllTenderItems,
  checkCatalogCoverage,
} from './product-matcher'
export type {
  ProductMatch,
  TenderItemMatch,
  ProductComparisonResult,
} from './product-matcher'

// Pricing Advisor
export {
  generatePricingRecommendation,
  analyzeTenderPricing,
} from './pricing-advisor'
export type {
  PricingRecommendation,
  PricingFactor,
  CompetitorPricing,
  MarketIntelligence,
} from './pricing-advisor'
