/**
 * Rate Limiting Middleware
 * Protects API routes from abuse using sliding window algorithm
 * Supports Redis for production environments
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../logger'
import { RATE_LIMIT_CONFIG, AUTH_SECURITY } from '../config/security'

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

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

interface RateLimitStore {
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>
  destroy(): void
}

/**
 * Redis-based rate limiter for production
 */
class RedisRateLimiter implements RateLimitStore {
  private redis: ReturnType<typeof import('redis').createClient> | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this.initialize()
    return this.initPromise
  }

  private async initialize(): Promise<void> {
    if (!RATE_LIMIT_CONFIG.REDIS_URL) {
      logger.warn('Redis URL not configured, rate limiting will use in-memory store')
      return
    }

    try {
      const { createClient } = await import('redis')
      this.redis = createClient({ url: RATE_LIMIT_CONFIG.REDIS_URL })
      await this.redis.connect()
      this.initialized = true
      logger.info('Redis rate limiter connected')
    } catch (error) {
      logger.error('Failed to connect to Redis for rate limiting', error as Error)
      this.redis = null
    }
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    await this.ensureInitialized()

    if (!this.redis) {
      // Fallback: return success if Redis unavailable (fail-open)
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        reset: Math.ceil((Date.now() + config.windowMs) / 1000),
      }
    }

    try {
      const now = Date.now()
      const windowStart = now - config.windowMs
      const redisKey = `ratelimit:${key}`

      // Use Redis sorted set for sliding window
      // Remove old entries
      await this.redis.zRemRangeByScore(redisKey, 0, windowStart)

      // Count current entries
      const count = await this.redis.zCard(redisKey)

      if (count >= config.maxRequests) {
        const oldestEntry = await this.redis.zRange(redisKey, 0, 0, { BY: 'SCORE' })
        const resetTime = oldestEntry.length
          ? parseInt(oldestEntry[0]) + config.windowMs
          : now + config.windowMs

        return {
          success: false,
          limit: config.maxRequests,
          remaining: 0,
          reset: Math.ceil(resetTime / 1000),
        }
      }

      // Add new request
      await this.redis.zAdd(redisKey, { score: now, value: now.toString() })
      await this.redis.expire(redisKey, Math.ceil(config.windowMs / 1000))

      return {
        success: true,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count - 1),
        reset: Math.ceil((now + config.windowMs) / 1000),
      }
    } catch (error) {
      logger.error('Redis rate limit check failed', error as Error)
      // Fail open
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        reset: Math.ceil((Date.now() + config.windowMs) / 1000),
      }
    }
  }

  destroy(): void {
    if (this.redis) {
      this.redis.quit().catch(() => {})
      this.redis = null
      this.initialized = false
    }
  }
}

/**
 * In-memory rate limiter for development
 * Uses WeakRef pattern for proper cleanup
 */
class InMemoryRateLimiter implements RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private isDestroyed = false

  constructor() {
    // Start cleanup interval
    this.startCleanup()
  }

  private startCleanup(): void {
    if (this.isDestroyed) return

    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL_MS)

    // Allow process to exit even if interval is running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
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
    this.isDestroyed = true
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }
}

/**
 * Factory function to create appropriate rate limiter store
 */
function createRateLimiterStore(): RateLimitStore {
  if (RATE_LIMIT_CONFIG.USE_REDIS && RATE_LIMIT_CONFIG.REDIS_URL) {
    return new RedisRateLimiter()
  }
  return new InMemoryRateLimiter()
}

// Global rate limiter instance
const rateLimiter = createRateLimiterStore()

// Cleanup on process exit
if (typeof process !== 'undefined') {
  const cleanup = () => rateLimiter.destroy()
  process.once('exit', cleanup)
  process.once('SIGINT', cleanup)
  process.once('SIGTERM', cleanup)
}

/**
 * Validate and extract client IP with spoofing protection
 */
function getClientIp(request: NextRequest): string {
  const trustedDepth = AUTH_SECURITY.TRUSTED_PROXY_DEPTH

  // Get X-Forwarded-For header
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim())

    // Validate IP format to prevent injection
    const validIps = ips.filter((ip) => isValidIp(ip))

    // Trust only the nth IP from the right based on proxy depth
    if (validIps.length > 0) {
      const index = Math.max(0, validIps.length - trustedDepth)
      return validIps[index]
    }
  }

  // Fallback to x-real-ip
  const realIp = request.headers.get('x-real-ip')
  if (realIp && isValidIp(realIp)) {
    return realIp
  }

  // Default fallback
  return '127.0.0.1'
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
function isValidIp(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.').map(Number)
    return parts.every((part) => part >= 0 && part <= 255)
  }

  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  return ipv6Pattern.test(ip) || ip === '::1'
}

/**
 * Default key generator - uses validated IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIp(request)
  return ip
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
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

      if (!result.success) {
        logger.warn('Rate limit exceeded', {
          context: { key, limit: result.limit, path: request.nextUrl.pathname },
        })

        const response = NextResponse.json(
          {
            success: false,
            error: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: result.reset,
          },
          { status: 429 }
        )

        addRateLimitHeaders(response, result)
        response.headers.set(
          'Retry-After',
          (result.reset - Math.floor(Date.now() / 1000)).toString()
        )

        return response
      }

      // Return null to continue processing
      // Rate limit headers will be added by the wrapper if needed
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
  strict: RATE_LIMIT_CONFIG.PRESETS.STRICT,

  // Standard - for regular API endpoints
  standard: RATE_LIMIT_CONFIG.PRESETS.STANDARD,

  // Generous - for public endpoints
  generous: RATE_LIMIT_CONFIG.PRESETS.GENEROUS,

  // Login - very strict for authentication
  login: RATE_LIMIT_CONFIG.PRESETS.LOGIN,

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

/**
 * Get rate limit info for current request (for adding headers to success responses)
 */
export async function getRateLimitInfo(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator
  const key = keyGenerator(request)
  return rateLimiter.check(key, config)
}
