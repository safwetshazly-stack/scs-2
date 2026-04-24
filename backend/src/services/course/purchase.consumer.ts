import { KafkaConsumer } from '../../../shared/kafka/kafka.consumer';
import { logger } from '../../../utils/logger';

export class PurchaseConsumer {
  private consumer: KafkaConsumer;

  constructor() {
    this.consumer = new KafkaConsumer('purchase-group');
  }

  async start() {
    this.consumer.subscribe('course.purchased', async (payload, correlationId) => {
      logger.info(`[PurchaseConsumer] Processing purchase for course: ${payload.courseId}`, { correlationId });
      
      // 1. Update library
      logger.debug(`[PurchaseConsumer] Updating library for user ${payload.userId}`);
      
      // 2. Calculate revenue
      logger.debug(`[PurchaseConsumer] Calculating revenue. Amount: ${payload.amount}`);
      
      // 3. Log audit
      logger.debug(`[PurchaseConsumer] Logging audit for purchase`);

      // Simulated processing time
      await new Promise(resolve => setTimeout(resolve, 50));
      
      logger.info(`[PurchaseConsumer] Finished processing purchase`, { correlationId });
    });

    await this.consumer.start();
  }
}

// Instantiate and start
export const purchaseConsumer = new PurchaseConsumer();
// purchaseConsumer.start().catch(console.error);
