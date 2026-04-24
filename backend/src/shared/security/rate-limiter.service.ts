import { Redis } from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export class GlobalRateLimiter {
  private static redis = new Redis(env.REDIS_URL);

  static async checkLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      return current <= limit;
    } catch (e) {
      logger.warn(`Rate limiter Redis failure: fallback to allow`);
      return true; // Fail open
    }
  }
}
