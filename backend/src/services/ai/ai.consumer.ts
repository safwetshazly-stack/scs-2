import { KafkaConsumer } from '../../../shared/kafka/kafka.consumer';
import { logger } from '../../../utils/logger';

export class AiConsumer {
  private consumer: KafkaConsumer;

  constructor() {
    this.consumer = new KafkaConsumer('ai-group');
  }

  async start() {
    this.consumer.subscribe('ai.used', async (payload, correlationId) => {
      logger.info(`[AiConsumer] Processing AI usage. Tokens: ${payload.tokens}`, { correlationId });
      
      // 1. Update usage quotas
      logger.debug(`[AiConsumer] Updating quota for user ${payload.userId}`);
      
      // 2. Log audit
      logger.debug(`[AiConsumer] Audit AI usage for model ${payload.model}`);

      // Simulated processing time
      await new Promise(resolve => setTimeout(resolve, 30));
      
      logger.info(`[AiConsumer] Finished processing AI usage`, { correlationId });
    });

    await this.consumer.start();
  }
}

// Instantiate and start
export const aiConsumer = new AiConsumer();
// aiConsumer.start().catch(console.error);
