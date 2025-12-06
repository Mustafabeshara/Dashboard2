/**
 * Request Context Middleware
 * Adds request tracking and context to all API requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../logger'
import crypto from 'crypto'

export interface RequestContext {
  requestId: string
  ip: string
  userAgent?: string
  path: string
  method: string
  startTime: number
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return crypto.randomUUID()
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cloudflare = request.headers.get('cf-connecting-ip')

  if (cloudflare) return cloudflare
  if (forwarded) return forwarded.split(',')[0].trim()
  if (real) return real

  // NextRequest doesn't have .ip property, fallback to localhost
  return '127.0.0.1'
}

/**
 * Create request context
 */
export function createRequestContext(request: NextRequest): RequestContext {
  return {
    requestId: generateRequestId(),
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
    path: request.nextUrl.pathname,
    method: request.method,
    startTime: Date.now(),
  }
}

/**
 * Wrap API handler with context
 */
export function withContext<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const context = createRequestContext(request)

    // Set logger context
    logger.setContext({
      requestId: context.requestId,
      ip: context.ip,
      userAgent: context.userAgent,
      path: context.path,
      method: context.method,
    })

    try {
      // Log incoming request
      logger.info(`${context.method} ${context.path}`, {
        context: {
          query: Object.fromEntries(request.nextUrl.searchParams),
        },
      })

      // Execute handler
      const response = await handler(request, ...args)

      // Log response
      const duration = Date.now() - context.startTime
      logger.info(`${context.method} ${context.path} - ${response.status}`, {
        context: {
          status: response.status,
          duration,
        },
      })

      // Add custom headers
      response.headers.set('X-Request-ID', context.requestId)
      response.headers.set('X-Response-Time', `${duration}ms`)

      return response
    } catch (error) {
      // Log error
      const duration = Date.now() - context.startTime
      logger.error(`${context.method} ${context.path} - Error`, error as Error, {
        duration,
      })

      throw error
    } finally {
      // Clear logger context
      logger.clearContext()
    }
  }
}

/**
 * Middleware to add security headers
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // CSP header (adjust based on your needs)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    )
  }

  return response
}
