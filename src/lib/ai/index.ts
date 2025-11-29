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
