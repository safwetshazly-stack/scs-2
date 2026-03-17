import { redis } from '../server'

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  },

  set: async <T>(key: string, value: T, ttl = 300): Promise<void> => {
    await redis.setEx(key, ttl, JSON.stringify(value))
  },

  del: async (...keys: string[]): Promise<void> => {
    if (keys.length > 0) await redis.del(keys)
  },

  invalidatePattern: async (pattern: string): Promise<void> => {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(keys)
  },

  remember: async <T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> => {
    const cached = await cache.get<T>(key)
    if (cached !== null) return cached
    const value = await fn()
    await cache.set(key, value, ttl)
    return value
  },
}

// Specific cache keys
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (username: string) => `profile:${username}`,
  community: (slug: string) => `community:${slug}`,
  course: (slug: string) => `course:${slug}`,
  adminStats: () => 'admin:stats',
  onlineUsers: () => 'online_users',
  userOnline: (id: string) => `online:${id}`,
  loginAttempts: (email: string) => `login_attempts:${email}`,
  loginLock: (email: string) => `login_lock:${email}`,
  tokenBlacklist: (token: string) => `blacklist:${token}`,
  socketRateLimit: (userId: string, event: string) => `socket_rl:${userId}:${event}`,
}
