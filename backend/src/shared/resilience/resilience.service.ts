import { logger } from '../../utils/logger';

export enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

export class ResilienceService {
  private static breakers: Map<string, any> = new Map();
  private static bulkheads: Map<string, number> = new Map();

  static initializeCircuitBreaker(
    serviceName: string,
    failureThreshold = 5,
    timeoutWindowMs = 10000,
    maxConcurrent = 100
  ) {
    this.breakers.set(serviceName, {
      state: CircuitState.CLOSED,
      failures: 0,
      nextAttempt: 0,
      failureThreshold,
      timeoutWindowMs,
      maxConcurrent,
    });
    this.bulkheads.set(serviceName, 0);
  }

  static async execute<T>(
    serviceName: string,
    fn: (signal: AbortSignal) => Promise<T>,
    fallback?: () => Promise<T>,
    timeoutMs: number = 5000,
    retries: number = 3
  ): Promise<T> {
    const breaker = this.breakers.get(serviceName);
    if (!breaker) {
      this.initializeCircuitBreaker(serviceName);
    }

    if (breaker.state === CircuitState.OPEN) {
      if (Date.now() > breaker.nextAttempt) {
        breaker.state = CircuitState.HALF_OPEN;
      } else {
        if (fallback) return fallback();
        throw new Error(`Circuit OPEN for ${serviceName}`);
      }
    }

    // Bulkhead pattern
    const activeRequests = this.bulkheads.get(serviceName) || 0;
    if (activeRequests >= breaker.maxConcurrent) {
      if (fallback) return fallback();
      throw new Error(`Bulkhead exhausted for ${serviceName}`);
    }

    this.bulkheads.set(serviceName, activeRequests + 1);

    let attempt = 0;
    while (attempt < retries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await fn(controller.signal);
        clearTimeout(timeoutId);

        // Success -> Reset circuit
        if (breaker.state === CircuitState.HALF_OPEN) {
          breaker.state = CircuitState.CLOSED;
          breaker.failures = 0;
        }

        this.bulkheads.set(serviceName, this.bulkheads.get(serviceName)! - 1);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // Timeout cancellation support
        if (error.name === 'AbortError') {
          logger.warn(`[Resilience] Timeout for ${serviceName}`);
        }

        attempt++;
        if (attempt >= retries) {
          breaker.failures++;
          if (breaker.failures >= breaker.failureThreshold) {
            breaker.state = CircuitState.OPEN;
            breaker.nextAttempt = Date.now() + breaker.timeoutWindowMs;
            logger.error(`[Resilience] Circuit OPEN for ${serviceName}`);
          }
          
          this.bulkheads.set(serviceName, this.bulkheads.get(serviceName)! - 1);
          
          if (fallback) return fallback();
          throw error;
        }

        // Exponential backoff with jitter
        const backoff = Math.pow(2, attempt) * 100 + Math.random() * 50;
        await new Promise(r => setTimeout(r, backoff));
      }
    }
    
    // Should never reach here
    throw new Error('Unexpected execution end');
  }
}
