import { logger } from '../../utils/logger';
import { EventPublisher } from '../events/event-publisher';
import { ResilienceService } from '../resilience/resilience.service';
import { ChaosService } from '../resilience/chaos.service';
import { GlobalRateLimiter } from '../security/rate-limiter.service';

export class AiWrapperService {
  /**
   * Hyperscale ready AI execution wrapper.
   * Isolates internal components from third-party APIs.
   */
  static async executePrompt(userId: string, prompt: string, model: string): Promise<string> {
    const isAllowed = await GlobalRateLimiter.checkLimit(`ai:${userId}`, 10, 60);
    if (!isAllowed) throw new Error('AI Rate Limit Exceeded');

    return ResilienceService.execute<string>(
      'AiService',
      async (signal: AbortSignal) => {
        logger.info(`[AiWrapperService] Executing prompt for user: ${userId} using model: ${model}`);
        await ChaosService.injectDelay();
        await ChaosService.injectFailure();
        
        // Simulate API call processing
        if (signal.aborted) throw new Error('AbortError');
        
        const simulatedResponse = `Simulated response for: ${prompt.substring(0, 20)}...`;
        const tokensUsed = Math.floor(Math.random() * 100) + 50;

        await EventPublisher.publishAiUsed(userId, tokensUsed, model);
        return simulatedResponse;
      },
      async () => "Fallback: AI Service is currently degraded.",
      5000, // 5s timeout
      3     // 3 retries
    );
  }
}
