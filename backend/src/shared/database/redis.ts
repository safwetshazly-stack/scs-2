/**
 * Shared Redis Layer
 * Single Redis client instance used across all modules for caching, sessions, pub/sub
 * 
 * RULES:
 * - All cache operations go through this client
 * - Modules can use for: caching, rate limiting, session storage, pub/sub
 * - Cache keys should be namespaced: `{module}:{operation}:{id}`
 */

import { createClient } from 'redis'
import { env } from '../../config/env'

export type RedisClient = ReturnType<typeof createClient>

const globalForRedis = global as unknown as { 
  redis: RedisClient
  pubClient: RedisClient
  subClient: RedisClient
}

export const redis =
  globalForRedis.redis || createClient({ url: env.REDIS_URL })

export const pubClient =
  globalForRedis.pubClient || redis.duplicate()

export const subClient =
  globalForRedis.subClient || redis.duplicate()

/**
 * Connect all clients
 */
export async function connectRedis(): Promise<void> {
  try {
    if (!redis.isOpen) await redis.connect()
    if (!pubClient.isOpen) await pubClient.connect()
    if (!subClient.isOpen) await subClient.connect()
  } catch (error) {
    console.error('Redis connection failed:', error)
    throw error
  }
}

/**
 * Disconnect all clients
 */
export async function disconnectRedis(): Promise<void> {
  try {
    if (redis.isOpen) await redis.disconnect()
    if (pubClient.isOpen) await pubClient.disconnect()
    if (subClient.isOpen) await subClient.disconnect()
  } catch (error) {
    console.error('Redis disconnection error:', error)
  }
}

/**
 * Health check
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping()
    return pong === 'PONG'
  } catch {
    return false
  }
}

/**
 * Cache key generator
 * Ensures consistent namespaced cache keys
 * 
 * Usage: cacheKey('user', 'profile', userId)
 * Result: 'user:profile:123'
 */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':')
}

/**
 * Clear cache by pattern
 * Useful for invalidating related cache entries
 */
export async function clearCachePattern(pattern: string): Promise<number> {
  const keys = await redis.keys(pattern)
  if (keys.length === 0) return 0
  return await redis.del(keys)
}
