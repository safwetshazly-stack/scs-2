import { Producer } from 'kafkajs';
import { kafkaClient } from './kafka.client';
import { logger } from '../../utils/logger';

export class KafkaProducer {
  private static producer: Producer;
  private static isConnected = false;

  static async connect(): Promise<void> {
    if (this.isConnected) return;
    this.producer = kafkaClient.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    await this.producer.connect();
    this.isConnected = true;
    logger.info('[KafkaProducer] Connected successfully');
  }

  static async publish(topic: string, event: { id: string; version: string; payload: any; correlationId?: string }): Promise<void> {
    if (!this.isConnected) await this.connect();

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.id,
            value: JSON.stringify({
              ...event,
              timestamp: new Date().toISOString(),
            }),
            headers: {
              correlationId: event.correlationId || event.id,
            },
          },
        ],
      });
      logger.debug(`[KafkaProducer] Published event to ${topic}`, { eventId: event.id, correlationId: event.correlationId });
    } catch (error) {
      logger.error(`[KafkaProducer] Failed to publish event to ${topic}`, { error, eventId: event.id });
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
    }
  }
}
