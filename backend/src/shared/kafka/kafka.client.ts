import { Kafka, logLevel, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

class KafkaClient {
  private static instance: KafkaClient;
  public kafka: Kafka;

  private constructor() {
    this.kafka = new Kafka({
      clientId: env.KAFKA_CLIENT_ID,
      brokers: env.KAFKA_BROKERS.split(','),
      logLevel: env.NODE_ENV === 'production' ? logLevel.ERROR : logLevel.WARN,
      logCreator: () => {
        return ({ level, log }) => {
          const { message, ...extra } = log;
          if (level === logLevel.ERROR) logger.error(`[Kafka] ${message}`, extra);
          else if (level === logLevel.WARN) logger.warn(`[Kafka] ${message}`, extra);
          else logger.info(`[Kafka] ${message}`, extra);
        };
      },
    });
  }

  public static getInstance(): KafkaClient {
    if (!KafkaClient.instance) {
      KafkaClient.instance = new KafkaClient();
    }
    return KafkaClient.instance;
  }
}

export const kafkaClient = KafkaClient.getInstance().kafka;
