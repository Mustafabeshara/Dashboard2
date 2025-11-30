/**
 * Rate Limiting System
 * Protects API endpoints from abuse
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from './logger'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  private cleanup() {
    const now = Date.now()
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }

  private getKey(request: NextRequest, identifier?: string): string {
    if (identifier) {
      return identifier
    }
    
    // Use IP address as default identifier
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const path = request.nextUrl.pathname
    return `${ip}:${path}`
  }

  check(
    request: NextRequest,
    config: RateLimitConfig,
    identifier?: string
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(request, identifier)
    const now = Date.now()

    // Initialize or reset if window expired
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 0,
        resetTime: now + config.windowMs,
      }
    }

    const entry = this.store[key]
    const allowed = entry.count < config.maxRequests

    if (allowed) {
      entry.count++
    } else {
      logger.warn('Rate limit exceeded', {
        context: {
          key,
          count: entry.count,
          limit: config.maxRequests,
          resetTime: new Date(entry.resetTime).toISOString(),
        },
      })
    }

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    }
  }

  reset(request: NextRequest, identifier?: string) {
    const key = this.getKey(request, identifier)
    delete this.store[key]
  }

  destroy() {
    clearInterval(this.cleanupInterval)
    this.store = {}
  }
}

// Create singleton instance
export const rateLimiter = new RateLimiter()

// Preset configurations
export const RateLimitPresets = {
  // Very strict - for sensitive operations
  STRICT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many requests. Please try again later.',
  },
  // Standard - for most API endpoints
  STANDARD: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests. Please try again later.',
  },
  // Relaxed - for public endpoints
  RELAXED: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300,
    message: 'Too many requests. Please try again later.',
  },
  // Auth - for login/register endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  },
  // File upload - for document uploads
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Too many uploads. Please try again later.',
  },
}

// Middleware helper
export function withRateLimit(
  config: RateLimitConfig = RateLimitPresets.STANDARD
) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>,
    identifier?: string
  ): Promise<NextResponse> => {
    const result = rateLimiter.check(request, config, identifier)

    // Add rate limit headers
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', String(config.maxRequests))
    headers.set('X-RateLimit-Remaining', String(result.remaining))
    headers.set('X-RateLimit-Reset', String(result.resetTime))

    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: config.message || 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers,
        }
      )
    }

    // Execute handler and add headers to response
    const response = await handler(request)
    
    // Copy rate limit headers to response
    headers.forEach((value, key) => {
      response.headers.set(key, value)
    })

    return response
  }
}

// User-specific rate limiting (requires authentication)
export function withUserRateLimit(
  config: RateLimitConfig = RateLimitPresets.STANDARD
) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>,
    userId: string
  ): Promise<NextResponse> => {
    return withRateLimit(config)(request, handler, `user:${userId}`)
  }
}

// IP-based rate limiting
export function withIPRateLimit(
  config: RateLimitConfig = RateLimitPresets.STANDARD
) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withRateLimit(config)(request, handler)
  }
}
