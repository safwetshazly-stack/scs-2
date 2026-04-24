import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafkaClient } from './kafka.client';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';
import { KafkaProducer } from './kafka.producer';

const prisma = new PrismaClient();

export type KafkaEventHandler = (payload: any, correlationId: string) => Promise<void>;

export class KafkaConsumer {
  private consumer: Consumer;
  private handlers: Map<string, KafkaEventHandler[]> = new Map();

  constructor(groupId: string = env.KAFKA_GROUP_ID) {
    this.consumer = kafkaClient.consumer({ groupId });
  }

  public subscribe(topic: string, handler: KafkaEventHandler): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    this.handlers.get(topic)!.push(handler);
  }

  public async start(): Promise<void> {
    await this.consumer.connect();
    
    for (const topic of this.handlers.keys()) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    logger.info(`[KafkaConsumer] Started listening to topics: ${Array.from(this.handlers.keys()).join(', ')}`);

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  private async handleMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
    const handlers = this.handlers.get(topic) || [];
    if (!message.value) return;

    let event: any;
    try {
      event = JSON.parse(message.value.toString());
    } catch (error) {
      logger.error(`[KafkaConsumer] Failed to parse message value on topic ${topic}`);
      return;
    }

    const eventId = event.id;
    const correlationId = message.headers?.correlationId?.toString() || eventId;

    // Idempotency check
    try {
      const alreadyProcessed = await prisma.processedEvent.findUnique({ where: { eventId } });
      if (alreadyProcessed) {
        logger.debug(`[KafkaConsumer] Skipping duplicate event ${eventId} on topic ${topic}`);
        return;
      }
    } catch (e) {
      logger.error(`[KafkaConsumer] Failed idempotency check for event ${eventId}`);
      // Proceeding might cause duplicates, failing is safer in strict environments
      throw e; 
    }

    // Process
    for (const handler of handlers) {
      try {
        await this.executeWithRetry(handler, event.payload, correlationId, topic, event);
      } catch (error) {
        logger.error(`[KafkaConsumer] Max retries reached for event ${eventId} on ${topic}. Moving to DLQ.`);
        await KafkaProducer.publish(`${topic}.dlq`, event);
      }
    }

    // Mark as processed
    try {
      await prisma.processedEvent.create({ data: { eventId, topic } });
    } catch (e) {
      logger.warn(`[KafkaConsumer] Could not save processed event state for ${eventId}`);
    }
  }

  private async executeWithRetry(
    handler: KafkaEventHandler, 
    payload: any, 
    correlationId: string, 
    topic: string,
    rawEvent: any,
    maxRetries = 3
  ): Promise<void> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        await handler(payload, correlationId);
        return;
      } catch (error: any) {
        attempt++;
        logger.warn(`[KafkaConsumer] Handler failed for ${topic} (Attempt ${attempt}/${maxRetries}): ${error.message}`);
        if (attempt >= maxRetries) throw error;
        await new Promise((res) => setTimeout(res, 1000 * attempt)); // Exponential backoff simulation
      }
    }
  }

  public async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }
}
