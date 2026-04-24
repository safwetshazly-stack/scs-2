import { Redis } from 'ioredis';
import { logger } from '../../../utils/logger';

export class MetricsService {
  constructor(private redis: Redis) {}

  /**
   * Track an API call
   */
  async trackApiCall(endpoint: string, method: string): Promise<void> {
    const key = `metrics:api:${method}:${endpoint}:${new Date().toISOString().slice(0, 10)}`;
    try {
      await this.redis.incr(key);
    } catch (error) {
      logger.error('Failed to track API call', { error });
    }
  }

  /**
   * Track an error
   */
  async trackError(service: string, errorType: string): Promise<void> {
    const key = `metrics:errors:${service}:${errorType}:${new Date().toISOString().slice(0, 10)}`;
    try {
      await this.redis.incr(key);
    } catch (error) {
      logger.error('Failed to track error', { error });
    }
  }

  /**
   * Track specific feature usage
   */
  async trackUsage(feature: string, userId: string): Promise<void> {
    const key = `metrics:usage:${feature}:${new Date().toISOString().slice(0, 10)}`;
    try {
      await this.redis.pfadd(key, userId); // HyperLogLog for unique users
    } catch (error) {
      logger.error('Failed to track usage', { error });
    }
  }

  /**
   * Track service execution time
   */
  async trackExecutionTime(service: string, durationMs: number): Promise<void> {
    const key = `metrics:timing:${service}:${new Date().toISOString().slice(0, 10)}`;
    try {
      // Store in a simple list for moving average calculation later
      await this.redis.lpush(key, durationMs.toString());
      await this.redis.ltrim(key, 0, 999); // Keep last 1000 requests
    } catch (error) {
      logger.error('Failed to track execution time', { error });
    }
  }
}
