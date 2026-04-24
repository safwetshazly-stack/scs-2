import { randomUUID } from 'crypto';
import { KafkaProducer } from '../kafka/kafka.producer';
import { EventType } from './event-types';

export class EventPublisher {
  static async publishUserRegistered(userId: string, email: string) {
    await KafkaProducer.publish('user.registered', {
      id: randomUUID(),
      version: 'v1',
      payload: { userId, email },
    });
  }

  static async publishCoursePurchased(userId: string, courseId: string, amount: number, platformId?: string) {
    await KafkaProducer.publish('course.purchased', {
      id: randomUUID(),
      version: 'v1',
      payload: { userId, courseId, amount, platformId },
    });
  }

  static async publishDownloadCreated(userId: string, resourceId: string, resourceType: string, deviceId: string) {
    await KafkaProducer.publish('download.created', {
      id: randomUUID(),
      version: 'v1',
      payload: { userId, resourceId, resourceType, deviceId },
    });
  }

  static async publishAiUsed(userId: string, tokens: number, model: string) {
    await KafkaProducer.publish('ai.used', {
      id: randomUUID(),
      version: 'v1',
      payload: { userId, tokens, model },
    });
  }
}
