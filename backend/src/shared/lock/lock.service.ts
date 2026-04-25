import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import { env } from '../../config/env';

export class LockService {
  private static redis = new Redis(env.REDIS_URL);

  static async acquireLock(key: string, ttlMs: number, retryCount = 3, retryDelayMs = 100): Promise<string> {
    const lockId = randomBytes(16).toString('hex');
    let attempts = 0;

    while (attempts < retryCount) {
      const acquired = await this.redis.set(key, lockId, 'PX', ttlMs, 'NX');
      if (acquired === 'OK') {
        return lockId;
      }
      
      attempts++;
      if (attempts < retryCount) {
        await new Promise(r => setTimeout(r, retryDelayMs));
      }
    }

    throw new Error(`Failed to acquire lock for key: ${key}`);
  }

  static async releaseLock(key: string, lockId: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(luaScript, 1, key, lockId);
    return result === 1;
  }
}
