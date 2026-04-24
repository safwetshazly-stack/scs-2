import { logger } from '../logger';

export function TrackPerformance(serviceName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        logger.info(`[Performance] ${serviceName}.${propertyKey}`, { durationMs: duration });
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(`[Performance Error] ${serviceName}.${propertyKey}`, { durationMs: duration, error });
        throw error;
      }
    };

    return descriptor;
  };
}

export async function withPerformanceTracking<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info(`[Performance] ${name}`, { durationMs: duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`[Performance Error] ${name}`, { durationMs: duration, error });
    throw error;
  }
}
