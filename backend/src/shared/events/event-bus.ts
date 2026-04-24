import { EventEmitter } from 'events';
import { AppEvent, EventType } from './event-types';
import { logger } from '../../utils/logger';

export class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50); // Hyperscale ready
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public publish(event: AppEvent): void {
    logger.debug(`[EventBus] Publishing ${event.type} - ID: ${event.id}`);
    this.emitter.emit(event.type, event);
  }

  public subscribe(eventType: EventType, handler: (event: AppEvent) => void | Promise<void>): void {
    logger.info(`[EventBus] Subscribed to ${eventType}`);
    this.emitter.on(eventType, async (event: AppEvent) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`[EventBus] Error handling ${eventType}`, { error, eventId: event.id });
      }
    });
  }
}

export const eventBus = EventBus.getInstance();
