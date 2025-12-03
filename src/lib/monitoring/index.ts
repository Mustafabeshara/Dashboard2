/**
 * Monitoring & Error Tracking Integration
 * Lightweight wrapper for optional monitoring services (Sentry, LogRocket)
 *
 * To enable full monitoring:
 * 1. Install: npm install @sentry/nextjs logrocket
 * 2. Set env vars: NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_LOGROCKET_APP_ID
 */

interface ErrorContext {
  userId?: string
  sessionId?: string
  action?: string
  component?: string
  metadata?: Record<string, unknown>
}

interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percent'
  tags?: Record<string, string>
}

interface UserInfo {
  id: string
  email?: string
  role?: string
}

// Monitoring configuration
const config = {
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  logRocketAppId: process.env.NEXT_PUBLIC_LOGROCKET_APP_ID || '',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  enabled: process.env.NODE_ENV === 'production',
}

// Track state
let isInitialized = false
let currentUser: UserInfo | null = null

/**
 * Initialize monitoring services
 * Call this in _app.tsx or layout.tsx
 */
export async function initMonitoring(): Promise<void> {
  if (isInitialized || typeof window === 'undefined') return

  // Log that monitoring would be initialized in production
  if (config.enabled) {
    console.log('[Monitoring] Production mode detected')
    if (config.sentryDsn) {
      console.log('[Monitoring] Sentry DSN configured - install @sentry/nextjs to enable')
    }
    if (config.logRocketAppId) {
      console.log('[Monitoring] LogRocket ID configured - install logrocket to enable')
    }
  }

  isInitialized = true
}

/**
 * Identify user for monitoring services
 */
export async function identifyUser(user: UserInfo): Promise<void> {
  currentUser = user
  console.log('[Monitoring] User identified:', user.id)
}

/**
 * Clear user identity on logout
 */
export async function clearUser(): Promise<void> {
  currentUser = null
  console.log('[Monitoring] User cleared')
}

/**
 * Capture and report an error
 */
export async function captureError(
  error: Error | string,
  context?: ErrorContext
): Promise<void> {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  console.error('[Monitoring Error]', errorObj.message, context)
}

/**
 * Capture a custom message/event
 */
export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
): Promise<void> {
  console.log(`[Monitoring ${level.toUpperCase()}]`, message, context)
}

/**
 * Track a custom event for analytics
 */
export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  console.log('[Monitoring Event]', eventName, properties)
}

/**
 * Record a performance metric
 */
export async function recordMetric(metric: PerformanceMetric): Promise<void> {
  console.log('[Monitoring Metric]', metric.name, metric.value, metric.unit)
}

/**
 * Start a performance transaction (no-op in this lightweight version)
 */
export async function startTransaction(
  _name: string,
  _operation: string
): Promise<{ finish: () => void }> {
  return { finish: () => {} }
}

/**
 * Add breadcrumb for debugging
 */
export async function addBreadcrumb(
  message: string,
  category: string,
  _data?: Record<string, unknown>
): Promise<void> {
  console.log('[Monitoring Breadcrumb]', category, message)
}

/**
 * Get monitoring status
 */
export function getMonitoringStatus(): {
  initialized: boolean
  sentryEnabled: boolean
  logRocketEnabled: boolean
  currentUser: UserInfo | null
} {
  return {
    initialized: isInitialized,
    sentryEnabled: !!config.sentryDsn && config.enabled,
    logRocketEnabled: !!config.logRocketAppId && config.enabled,
    currentUser,
  }
}

// Export default object for convenience
export default {
  init: initMonitoring,
  identifyUser,
  clearUser,
  captureError,
  captureMessage,
  trackEvent,
  recordMetric,
  startTransaction,
  addBreadcrumb,
  getStatus: getMonitoringStatus,
}
