import { Redis } from 'ioredis';
import { env } from '../../config/env';

export class CacheService {
  private static redis = new Redis(env.REDIS_URL);

  static async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as T;

    const freshData = await fetcher();
    await this.redis.setex(key, ttlSeconds, JSON.stringify(freshData));
    return freshData;
  }

  static async invalidate(keyPattern: string): Promise<void> {
    const stream = this.redis.scanStream({ match: keyPattern, count: 100 });
    for await (const keys of stream) {
      if (keys.length) {
        const pipeline = this.redis.pipeline();
        keys.forEach(k => pipeline.del(k));
        await pipeline.exec();
      }
    }
  }
}
