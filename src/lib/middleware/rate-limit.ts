/**
 * Rate Limiting Middleware
 * Protects API routes from abuse using sliding window algorithm
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimitError } from '../errors/error-handler'
import { logger } from '../logger'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string // Custom key generator
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
}

interface RateLimitEntry {
  count: number
  resetTime: number
  requests: number[] // Timestamps of requests
}

/**
 * In-memory rate limiter (use Redis in production)
 */
class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  async check(key: string, config: RateLimitConfig): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const now = Date.now()
    const resetTime = now + config.windowMs

    let entry = this.store.get(key)

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 0,
        resetTime,
        requests: [],
      }
      this.store.set(key, entry)
    }

    // Remove requests outside the window
    entry.requests = entry.requests.filter(
      (timestamp) => timestamp > now - config.windowMs
    )

    // Check if limit exceeded
    const success = entry.requests.length < config.maxRequests

    if (success) {
      entry.requests.push(now)
    }

    return {
      success,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.requests.length),
      reset: Math.ceil(entry.resetTime / 1000),
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
  }
}

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter()

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : (realIp || '127.0.0.1')
  return `ratelimit:${ip}`
}

/**
 * Rate limit middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const keyGenerator = config.keyGenerator || defaultKeyGenerator
    const key = keyGenerator(request)

    try {
      const result = await rateLimiter.check(key, config)

      // Add rate limit headers to response
      const headers = new Headers()
      headers.set('X-RateLimit-Limit', result.limit.toString())
      headers.set('X-RateLimit-Remaining', result.remaining.toString())
      headers.set('X-RateLimit-Reset', result.reset.toString())

      if (!result.success) {
        logger.warn('Rate limit exceeded', {
          context: { key, limit: result.limit, path: request.nextUrl.pathname },
        })

        return NextResponse.json(
          {
            error: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: result.reset,
          },
          {
            status: 429,
            headers: {
              ...Object.fromEntries(headers.entries()),
              'Retry-After': (result.reset - Math.floor(Date.now() / 1000)).toString(),
            },
          }
        )
      }

      // Return null to continue processing
      return null
    } catch (error) {
      logger.error('Rate limit check failed', error as Error)
      // Fail open - allow request if rate limiter fails
      return null
    }
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // Strict - for sensitive operations
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
  
  // Standard - for regular API endpoints
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  
  // Generous - for public endpoints
  generous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
  },
  
  // Per-minute limits
  perMinute: (maxRequests: number) => ({
    windowMs: 60 * 1000, // 1 minute
    maxRequests,
  }),
  
  // Per-hour limits
  perHour: (maxRequests: number) => ({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests,
  }),
}

/**
 * Create rate limiter with custom key (e.g., user ID)
 */
export function createRateLimiter(
  config: RateLimitConfig,
  keyPrefix: string = 'custom'
) {
  return rateLimit({
    ...config,
    keyGenerator: (request) => {
      const defaultKey = defaultKeyGenerator(request)
      return `${keyPrefix}:${defaultKey}`
    },
  })
}
