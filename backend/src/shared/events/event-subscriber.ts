import { eventBus } from './event-bus';
import { EventType, CoursePurchasedEvent, AiUsedEvent, DownloadCreatedEvent } from './event-types';
import { logger } from '../../utils/logger';

export class EventSubscriber {
  static initialize() {
    // 1. Library Update & Revenue Calculation
    eventBus.subscribe(EventType.COURSE_PURCHASED, async (e) => {
      const event = e as CoursePurchasedEvent;
      logger.info(`[Subscriber] Updating library & calculating revenue for course ${event.payload.courseId}`);
      // In hyperscale: queue a job to update Library Model and Revenue tracking.
    });

    // 2. Audit Logs
    eventBus.subscribe(EventType.AI_USED, async (e) => {
      const event = e as AiUsedEvent;
      logger.info(`[Subscriber] Creating audit log for AI usage - Tokens: ${event.payload.tokens}`);
      // In hyperscale: write to AuditLog DB or Elasticsearch.
    });

    // 3. Notifications & Auditing
    eventBus.subscribe(EventType.DOWNLOAD_CREATED, async (e) => {
      const event = e as DownloadCreatedEvent;
      logger.info(`[Subscriber] Logging download for resource ${event.payload.resourceId} to device ${event.payload.deviceId}`);
      // Notify user, update device logs, trigger anti-piracy scan.
    });

    logger.info('[EventSubscriber] All subscriptions initialized');
  }
}
