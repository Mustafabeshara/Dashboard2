/**
 * Caching Layer
 * In-memory cache with Redis support (when available)
 */

import { logger } from './logger'

interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
}

// Redis client interface for type safety
interface RedisClientInterface {
  get: (key: string) => Promise<string | null>
  setEx: (key: string, ttl: number, value: string) => Promise<unknown>
  del: (key: string | string[]) => Promise<number>
  keys: (pattern: string) => Promise<string[]>
  flushAll: () => Promise<unknown>
  connect: () => Promise<unknown>
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: RedisClientInterface | null = null
  private readonly MAX_CACHE_SIZE = 10000
  private accessOrder: string[] = [] // For LRU tracking
  private cleanupInterval: NodeJS.Timeout | null = null
  private isDestroyed = false

  constructor() {
    this.initializeRedis()
    this.startCleanup()
  }

  private startCleanup(): void {
    if (this.isDestroyed) return

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)

    // Allow process to exit even if interval is running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Destroy the cache manager and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.memoryCache.clear()
    this.accessOrder = []
    if (this.redis) {
      // Note: Redis connection cleanup handled separately
      this.redis = null
    }
  }

  private async initializeRedis() {
    // Try to connect to Redis if available
    try {
      if (process.env.REDIS_URL) {
        // Dynamically import Redis only if URL is provided
        const { createClient } = await import('redis')
        const client = createClient({ url: process.env.REDIS_URL })
        await client.connect()
        this.redis = client as unknown as RedisClientInterface
        logger.info('Redis cache connected')
      }
    } catch (error) {
      logger.warn('Redis not available, using in-memory cache', { error })
      this.redis = null
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key)
        this.removeFromAccessOrder(key)
      }
    }
  }

  private removeFromAccessOrder(key: string) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private evictOldest() {
    if (this.accessOrder.length === 0) return
    const oldestKey = this.accessOrder.shift()
    if (oldestKey) {
      this.memoryCache.delete(oldestKey)
      logger.debug(`Evicted oldest cache entry: ${oldestKey}`)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.redis) {
        const value = await this.redis.get(key)
        if (value) {
          logger.debug(`Cache hit (Redis): ${key}`)
          return JSON.parse(value)
        }
      }

      // Fallback to memory cache
      const entry = this.memoryCache.get(key)
      if (entry && entry.expiresAt > Date.now()) {
        logger.debug(`Cache hit (Memory): ${key}`)
        // Update LRU order
        this.removeFromAccessOrder(key)
        this.accessOrder.push(key)
        return entry.value as T
      }

      logger.debug(`Cache miss: ${key}`)
      return null
    } catch (error) {
      logger.error('Cache get error', error as Error, { key })
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      const expiresAt = Date.now() + ttlSeconds * 1000

      // Set in Redis if available
      if (this.redis) {
        await this.redis.setEx(key, ttlSeconds, JSON.stringify(value))
        logger.debug(`Cache set (Redis): ${key}`, { ttl: ttlSeconds })
      }

      // Check size before adding to memory cache
      if (this.memoryCache.size >= this.MAX_CACHE_SIZE) {
        this.evictOldest()
      }

      // Always set in memory cache as fallback
      this.memoryCache.set(key, { value, expiresAt })
      this.removeFromAccessOrder(key)
      this.accessOrder.push(key)
      logger.debug(`Cache set (Memory): ${key}`, { ttl: ttlSeconds })
    } catch (error) {
      logger.error('Cache set error', error as Error, { key })
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key)
      }
      this.memoryCache.delete(key)
      logger.debug(`Cache deleted: ${key}`)
    } catch (error) {
      logger.error('Cache delete error', error as Error, { key })
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // Clear matching keys
        if (this.redis) {
          const keys = await this.redis.keys(pattern)
          if (keys.length > 0) {
            await this.redis.del(keys)
          }
        }
        // Clear from memory cache
        for (const key of this.memoryCache.keys()) {
          if (key.includes(pattern.replace('*', ''))) {
            this.memoryCache.delete(key)
          }
        }
        logger.info(`Cache cleared: ${pattern}`)
      } else {
        // Clear all
        if (this.redis) {
          await this.redis.flushAll()
        }
        this.memoryCache.clear()
        logger.info('Cache cleared: all')
      }
    } catch (error) {
      logger.error('Cache clear error', error as Error, { pattern })
    }
  }

  // Helper method to cache function results
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const result = await fn()
    await this.set(key, result, ttlSeconds)
    return result
  }
}

// Create singleton instance
export const cache = new CacheManager()

// Type for list parameters
export interface ListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: unknown
}

// Cache key generators
export const CacheKeys = {
  tenders: {
    list: (params: ListParams) => `tenders:list:${JSON.stringify(params)}`,
    detail: (id: string) => `tenders:detail:${id}`,
    stats: () => 'tenders:stats',
  },
  customers: {
    list: (params: ListParams) => `customers:list:${JSON.stringify(params)}`,
    detail: (id: string) => `customers:detail:${id}`,
  },
  invoices: {
    list: (params: ListParams) => `invoices:list:${JSON.stringify(params)}`,
    detail: (id: string) => `invoices:detail:${id}`,
  },
  reports: {
    generate: (template: string, params: Record<string, unknown>) =>
      `reports:${template}:${JSON.stringify(params)}`,
  },
  dashboard: {
    stats: () => 'dashboard:stats',
  },
}

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
}
