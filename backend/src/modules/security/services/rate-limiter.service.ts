import { logger } from '../../../utils/logger'
import { AppError } from '../../../utils/errors'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests in window
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class RateLimiterService {
  private store = new Map<string, RateLimitEntry>()

  // Configuration for different rate limit types
  private readonly configs = {
    ai_requests: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
    downloads: { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50 downloads per hour
    login_attempts: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 login attempts per 15 mins
    token_generation: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 token generations per minute
    purchases: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 purchases per hour
  }

  /**
   * Check if request is within rate limit
   * Returns true if request should be allowed
   */
  checkLimit(key: string, limitType: keyof typeof this.configs): { allowed: boolean; retryAfter?: number } {
    try {
      const config = this.configs[limitType]
      const now = Date.now()
      const entry = this.store.get(key)

      if (!entry) {
        // First request in window
        this.store.set(key, {
          count: 1,
          resetAt: now + config.windowMs,
        })
        return { allowed: true }
      }

      // Check if window has expired
      if (now > entry.resetAt) {
        // Window expired, reset counter
        this.store.set(key, {
          count: 1,
          resetAt: now + config.windowMs,
        })
        return { allowed: true }
      }

      // Within window, check if limit exceeded
      if (entry.count >= config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000) // Convert to seconds
        logger.warn(`Rate limit exceeded for key: ${key}, type: ${limitType}`)
        return { allowed: false, retryAfter }
      }

      // Increment counter
      entry.count++
      return { allowed: true }
    } catch (error) {
      logger.error('Error checking rate limit:', error)
      // Fail open - allow request if rate limiter fails
      return { allowed: true }
    }
  }

  /**
   * Check and throw error if rate limited
   */
  async assertRateLimit(key: string, limitType: keyof typeof this.configs): Promise<void> {
    const result = this.checkLimit(key, limitType)

    if (!result.allowed) {
      throw new AppError(
        `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
        429,
        {
          retryAfter: result.retryAfter,
          retryAfterMs: result.retryAfter ? result.retryAfter * 1000 : undefined,
        }
      )
    }
  }

  /**
   * Reset rate limit for a key
   */
  resetLimit(key: string): void {
    this.store.delete(key)
    logger.info(`Rate limit reset for key: ${key}`)
  }

  /**
   * Reset all rate limits
   */
  resetAllLimits(): void {
    this.store.clear()
    logger.info('All rate limits reset')
  }

  /**
   * Get current limit status for a key
   */
  getStatus(key: string, limitType: keyof typeof this.configs): {
    current: number
    limit: number
    resetAt: Date | null
    remaining: number
  } {
    const config = this.configs[limitType]
    const entry = this.store.get(key)

    if (!entry) {
      return {
        current: 0,
        limit: config.maxRequests,
        resetAt: null,
        remaining: config.maxRequests,
      }
    }

    const now = Date.now()
    if (now > entry.resetAt) {
      return {
        current: 0,
        limit: config.maxRequests,
        resetAt: null,
        remaining: config.maxRequests,
      }
    }

    return {
      current: entry.count,
      limit: config.maxRequests,
      resetAt: new Date(entry.resetAt),
      remaining: Math.max(0, config.maxRequests - entry.count),
    }
  }

  /**
   * Cleanup old entries from store (background task)
   * Removes entries that have expired
   */
  cleanup(): number {
    try {
      const now = Date.now()
      let removed = 0

      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetAt) {
          this.store.delete(key)
          removed++
        }
      }

      if (removed > 0) {
        logger.info(`Rate limiter cleanup: removed ${removed} expired entries`)
      }

      return removed
    } catch (error) {
      logger.error('Error during rate limiter cleanup:', error)
      return 0
    }
  }

  /**
   * Get store size
   */
  getStoreSize(): number {
    return this.store.size
  }
}

// Export singleton instance
export const rateLimiterService = new RateLimiterService()

// Run cleanup every 5 minutes
setInterval(() => {
  rateLimiterService.cleanup()
}, 5 * 60 * 1000)

export default rateLimiterService
