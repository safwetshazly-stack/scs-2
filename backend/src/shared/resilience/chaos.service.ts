import { logger } from '../../utils/logger';
import { env } from '../../config/env';

export class ChaosService {
  static injectDelay(ms: number = 2000): Promise<void> {
    if (env.NODE_ENV === 'production') return Promise.resolve();
    if (Math.random() > 0.9) {
      logger.warn(`[Chaos] Injecting ${ms}ms delay`);
      return new Promise(r => setTimeout(r, ms));
    }
    return Promise.resolve();
  }

  static injectFailure(rate: number = 0.05): void {
    if (env.NODE_ENV === 'production') return;
    if (Math.random() < rate) {
      logger.error(`[Chaos] Simulating random service failure`);
      throw new Error('Chaos Monkey Failure');
    }
  }
}
