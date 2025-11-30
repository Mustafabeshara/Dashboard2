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
  [key: string]: any
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

class Logger {
  private context: LogContext = {}

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  clearContext() {
    this.context = {}
  }

  private log(level: LogLevel, message: string, meta?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...meta?.context },
    }

    if (meta?.error) {
      entry.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack,
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

    // TODO: Send to external logging service
    // if (process.env.NODE_ENV === 'production') {
    //   sendToLoggingService(entry)
    // }
  }

  debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, message, meta)
  }

  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta)
  }

  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta)
  }

  error(message: string, error?: Error, meta?: any) {
    this.log(LogLevel.ERROR, message, { ...meta, error })
  }

  fatal(message: string, error?: Error, meta?: any) {
    this.log(LogLevel.FATAL, message, { ...meta, error })
  }

  // API-specific logging
  apiRequest(request: NextRequest, meta?: any) {
    this.info('API Request', {
      context: {
        method: request.method,
        path: request.nextUrl.pathname,
        query: Object.fromEntries(request.nextUrl.searchParams),
        ip: request.ip || request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
        ...meta,
      },
    })
  }

  apiResponse(request: NextRequest, status: number, duration: number, meta?: any) {
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

  apiError(request: NextRequest, error: Error, meta?: any) {
    this.error('API Error', error, {
      context: {
        method: request.method,
        path: request.nextUrl.pathname,
        ip: request.ip || request.headers.get('x-forwarded-for'),
        ...meta,
      },
    })
  }

  // Database operation logging
  dbQuery(operation: string, table: string, duration: number, meta?: any) {
    this.debug('Database Query', {
      context: {
        operation,
        table,
        ...meta,
      },
      duration,
    })
  }

  dbError(operation: string, table: string, error: Error, meta?: any) {
    this.error('Database Error', error, {
      context: {
        operation,
        table,
        ...meta,
      },
    })
  }

  // Authentication logging
  authSuccess(userId: string, method: string, meta?: any) {
    this.info('Authentication Success', {
      context: {
        userId,
        method,
        ...meta,
      },
    })
  }

  authFailure(email: string, reason: string, meta?: any) {
    this.warn('Authentication Failure', {
      context: {
        email,
        reason,
        ...meta,
      },
    })
  }

  // Business logic logging
  businessEvent(event: string, meta?: any) {
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
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
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
