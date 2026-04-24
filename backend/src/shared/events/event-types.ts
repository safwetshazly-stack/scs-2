export enum EventType {
  USER_REGISTERED = 'USER_REGISTERED',
  COURSE_PURCHASED = 'COURSE_PURCHASED',
  DOWNLOAD_CREATED = 'DOWNLOAD_CREATED',
  AI_USED = 'AI_USED',
}

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  payload: any;
}

export interface UserRegisteredEvent extends BaseEvent {
  type: EventType.USER_REGISTERED;
  payload: { userId: string; email: string };
}

export interface CoursePurchasedEvent extends BaseEvent {
  type: EventType.COURSE_PURCHASED;
  payload: { userId: string; courseId: string; amount: number; platformId?: string };
}

export interface DownloadCreatedEvent extends BaseEvent {
  type: EventType.DOWNLOAD_CREATED;
  payload: { userId: string; resourceId: string; resourceType: string; deviceId: string };
}

export interface AiUsedEvent extends BaseEvent {
  type: EventType.AI_USED;
  payload: { userId: string; tokens: number; model: string };
}

export type AppEvent = UserRegisteredEvent | CoursePurchasedEvent | DownloadCreatedEvent | AiUsedEvent;
