/**
 * Business Rules Configuration
 * Centralized configuration for business logic with environment variable support
 */

import { getEnv } from './env-validator'

/**
 * Budget approval thresholds in KWD
 */
export const APPROVAL_THRESHOLDS = {
  get AUTO_APPROVE() {
    return getEnv().AUTO_APPROVE_THRESHOLD
  },
  get MANAGER() {
    return getEnv().MANAGER_APPROVE_THRESHOLD
  },
  get FINANCE_MANAGER() {
    return getEnv().FINANCE_MANAGER_APPROVE_THRESHOLD
  },
  get CFO() {
    return getEnv().CFO_APPROVE_THRESHOLD
  },
}

/**
 * Budget alert thresholds as percentages
 */
export const BUDGET_THRESHOLDS = {
  get WARNING() {
    return getEnv().BUDGET_WARNING_THRESHOLD
  },
  get CRITICAL() {
    return getEnv().BUDGET_CRITICAL_THRESHOLD
  },
}

/**
 * Currency configuration
 */
export const CURRENCY_CONFIG = {
  get DEFAULT() {
    return getEnv().DEFAULT_CURRENCY
  },
  SUPPORTED: ['KWD', 'USD', 'EUR', 'GBP', 'SAR', 'AED'],
  SYMBOLS: {
    KWD: 'KD',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SAR: 'SR',
    AED: 'AED',
  },
}

/**
 * Session configuration
 */
export const SESSION_CONFIG = {
  get TIMEOUT_MINUTES() {
    return getEnv().SESSION_TIMEOUT
  },
  get TIMEOUT_MS() {
    return this.TIMEOUT_MINUTES * 60 * 1000
  },
}

/**
 * File upload limits
 */
export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES: 10,
  ALLOWED_TYPES: {
    documents: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    images: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'],
    spreadsheets: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
  },
}

/**
 * Pagination defaults
 */
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
}

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 15 * 60, // 15 minutes
  LONG: 60 * 60, // 1 hour
  DAY: 24 * 60 * 60, // 24 hours
}

/**
 * AI Processing limits
 */
export const AI_LIMITS = {
  MAX_DOCUMENT_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_TEXT_LENGTH: 100000, // characters
  CHUNK_SIZE: 50000, // characters per chunk
  TIMEOUT_MS: 30000, // 30 seconds per request
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
}

/**
 * Tender specific rules
 */
export const TENDER_RULES = {
  MIN_ITEMS: 1,
  MAX_ITEMS: 1000,
  REFERENCE_LENGTH: {
    MIN: 3,
    MAX: 50,
  },
  TITLE_LENGTH: {
    MIN: 5,
    MAX: 200,
  },
  DESCRIPTION_LENGTH: {
    MAX: 5000,
  },
}

/**
 * Budget specific rules
 */
export const BUDGET_RULES = {
  FISCAL_YEAR_RANGE: {
    MIN: 2020,
    MAX: 2050,
  },
  CATEGORY_LEVELS: {
    MAX_DEPTH: 4,
    MAX_CHILDREN: 50,
  },
  VARIANCE_THRESHOLD: {
    MIN: 0,
    MAX: 100,
  },
}

/**
 * User management rules
 */
export const USER_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
}

/**
 * Audit log retention
 */
export const AUDIT_RETENTION = {
  DAYS: 365,
  CRITICAL_DAYS: 2555, // 7 years for financial records
}

/**
 * Get allowed file types for a category
 */
export function getAllowedFileTypes(category: keyof typeof FILE_UPLOAD_LIMITS.ALLOWED_TYPES): string[] {
  return FILE_UPLOAD_LIMITS.ALLOWED_TYPES[category] || []
}

/**
 * Check if file type is allowed
 */
export function isFileTypeAllowed(mimeType: string, category: keyof typeof FILE_UPLOAD_LIMITS.ALLOWED_TYPES): boolean {
  return getAllowedFileTypes(category).includes(mimeType)
}

/**
 * Get required approval level based on amount
 */
export function getRequiredApprovalLevel(amount: number): string {
  if (amount < APPROVAL_THRESHOLDS.AUTO_APPROVE) return 'AUTO_APPROVE'
  if (amount < APPROVAL_THRESHOLDS.MANAGER) return 'MANAGER'
  if (amount < APPROVAL_THRESHOLDS.FINANCE_MANAGER) return 'FINANCE_MANAGER'
  if (amount < APPROVAL_THRESHOLDS.CFO) return 'CFO'
  return 'CEO'
}

/**
 * Check if budget variance exceeds threshold
 */
export function isBudgetVarianceExceeded(spentPercentage: number): {
  isWarning: boolean
  isCritical: boolean
  isExceeded: boolean
} {
  return {
    isWarning: spentPercentage >= BUDGET_THRESHOLDS.WARNING,
    isCritical: spentPercentage >= BUDGET_THRESHOLDS.CRITICAL,
    isExceeded: spentPercentage >= 100,
  }
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number, currency: string = CURRENCY_CONFIG.DEFAULT): string {
  const symbol = CURRENCY_CONFIG.SYMBOLS[currency as keyof typeof CURRENCY_CONFIG.SYMBOLS] || currency
  return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Validate password against rules
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const rules = USER_RULES.PASSWORD

  if (password.length < rules.MIN_LENGTH) {
    errors.push(`Password must be at least ${rules.MIN_LENGTH} characters`)
  }

  if (password.length > rules.MAX_LENGTH) {
    errors.push(`Password must not exceed ${rules.MAX_LENGTH} characters`)
  }

  if (rules.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (rules.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (rules.REQUIRE_NUMBER && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (rules.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
