/**
 * Comprehensive Logging System
 * Structured logging with different levels and contexts
 */

import { NextRequest } from 'next/server'

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

interface LogContext {
  userId?: string
  requestId?: string
  ip?: string
  userAgent?: string
  path?: string
  method?: string
  [key: string]: string | number | boolean | null | undefined | object
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
  duration?: number
}

// Meta type for log methods - allows flexible additional properties
// Using Record<string, unknown> as base for backwards compatibility
type LogMeta = Record<string, unknown> & {
  context?: LogContext
  error?: Error | unknown
  duration?: number
}

class Logger {
  private context: LogContext = {}

  /**
   * Send log entry to external logging service
   * Supports multiple backends: HTTP endpoint, Sentry, Datadog, etc.
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    const loggingEndpoint = process.env.LOGGING_ENDPOINT
    const loggingApiKey = process.env.LOGGING_API_KEY

    if (!loggingEndpoint) {
      return // No external logging configured
    }

    try {
      const response = await fetch(loggingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(loggingApiKey ? { 'Authorization': `Bearer ${loggingApiKey}` } : {}),
        },
        body: JSON.stringify({
          ...entry,
          service: 'medical-distribution-dashboard',
          environment: process.env.NODE_ENV || 'development',
          version: process.env.APP_VERSION || '1.0.0',
        }),
      })

      if (!response.ok) {
        throw new Error(`Logging service returned ${response.status}`)
      }
    } catch (error) {
      // Re-throw to be caught by the caller
      throw error
    }
  }

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  clearContext() {
    this.context = {}
  }

  private log(level: LogLevel, message: string, meta?: LogMeta) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...meta?.context },
    }

    if (meta?.error) {
      // Handle both Error objects and unknown error types
      const err = meta.error
      if (err instanceof Error) {
        entry.error = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        }
      } else if (typeof err === 'object' && err !== null) {
        entry.error = {
          name: 'Error',
          message: String((err as Record<string, unknown>).message || err),
          stack: String((err as Record<string, unknown>).stack || ''),
        }
      } else {
        entry.error = {
          name: 'Error',
          message: String(err),
        }
      }
    }

    if (meta?.duration !== undefined) {
      entry.duration = meta.duration
    }

    // In production, send to logging service (e.g., Datadog, Sentry)
    // For now, use console with structured format
    const logString = JSON.stringify(entry, null, 2)

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logString)
        break
      case LogLevel.INFO:
        console.info(logString)
        break
      case LogLevel.WARN:
        console.warn(logString)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logString)
        break
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry).catch((err) => {
        // Fail silently to not disrupt application flow
        console.error('Failed to send log to external service:', err)
      })
    }
  }

  debug(message: string, meta?: LogMeta) {
    this.log(LogLevel.DEBUG, message, meta)
  }

  info(message: string, meta?: LogMeta) {
    this.log(LogLevel.INFO, message, meta)
  }

  warn(message: string, meta?: LogMeta) {
    this.log(LogLevel.WARN, message, meta)
  }

  error(message: string, error?: Error, meta?: LogMeta) {
    this.log(LogLevel.ERROR, message, { ...meta, error })
  }

  fatal(message: string, error?: Error, meta?: LogMeta) {
    this.log(LogLevel.FATAL, message, { ...meta, error })
  }

  // API-specific logging
  apiRequest(request: NextRequest, meta?: LogContext) {
    this.info('API Request', {
      context: {
        method: request.method,
        path: request.nextUrl.pathname,
        query: Object.fromEntries(request.nextUrl.searchParams),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        ...meta,
      },
    })
  }

  apiResponse(request: NextRequest, status: number, duration: number, meta?: LogContext) {
    this.info('API Response', {
      context: {
        method: request.method,
        path: request.nextUrl.pathname,
        status,
        ...meta,
      },
      duration,
    })
  }

  apiError(request: NextRequest, error: Error, meta?: LogContext) {
    this.error('API Error', error, {
      context: {
        method: request.method,
        path: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        ...meta,
      },
    })
  }

  // Database operation logging
  dbQuery(operation: string, table: string, duration: number, meta?: LogContext) {
    this.debug('Database Query', {
      context: {
        operation,
        table,
        ...meta,
      },
      duration,
    })
  }

  dbError(operation: string, table: string, error: Error, meta?: LogContext) {
    this.error('Database Error', error, {
      context: {
        operation,
        table,
        ...meta,
      },
    })
  }

  // Authentication logging
  authSuccess(userId: string, method: string, meta?: LogContext) {
    this.info('Authentication Success', {
      context: {
        userId,
        method,
        ...meta,
      },
    })
  }

  authFailure(email: string, reason: string, meta?: LogContext) {
    this.warn('Authentication Failure', {
      context: {
        email,
        reason,
        ...meta,
      },
    })
  }

  // Business logic logging
  businessEvent(event: string, meta?: LogContext) {
    this.info(`Business Event: ${event}`, { context: meta })
  }
}

// Create singleton instance
export const logger = new Logger()

// Request context middleware helper
export function createRequestLogger(request: NextRequest, userId?: string) {
  const requestId = crypto.randomUUID()
  
  const requestLogger = new Logger()
  requestLogger.setContext({
    requestId,
    userId,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    path: request.nextUrl.pathname,
    method: request.method,
  })

  return { requestLogger, requestId }
}

// Performance monitoring helper
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  
  return fn()
    .then((result) => {
      const duration = Date.now() - start
      logger.debug(`Performance: ${operation}`, { duration })
      return result
    })
    .catch((error) => {
      const duration = Date.now() - start
      logger.error(`Performance: ${operation} (failed)`, error, { duration })
      throw error
    })
}

// Error formatting helper
export function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    }
  }
  return {
    message: String(error),
  }
}
