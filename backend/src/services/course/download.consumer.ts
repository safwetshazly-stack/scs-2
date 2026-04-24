import { KafkaConsumer } from '../../../shared/kafka/kafka.consumer';
import { logger } from '../../../utils/logger';

export class DownloadConsumer {
  private consumer: KafkaConsumer;

  constructor() {
    this.consumer = new KafkaConsumer('download-group');
  }

  async start() {
    this.consumer.subscribe('download.created', async (payload, correlationId) => {
      logger.info(`[DownloadConsumer] Processing download for resource: ${payload.resourceId}`, { correlationId });
      
      // 1. Check anti-piracy
      logger.debug(`[DownloadConsumer] Checking anti-piracy rules for device ${payload.deviceId}`);
      
      // 2. Log download metrics
      logger.debug(`[DownloadConsumer] Logging download for user ${payload.userId}`);

      // Simulated processing time
      await new Promise(resolve => setTimeout(resolve, 40));
      
      logger.info(`[DownloadConsumer] Finished processing download`, { correlationId });
    });

    await this.consumer.start();
  }
}

// Instantiate and start
export const downloadConsumer = new DownloadConsumer();
// downloadConsumer.start().catch(console.error);
