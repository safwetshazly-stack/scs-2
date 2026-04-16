/**
 * Notification Module
 *
 * Public API for notification management
 *
 * Responsibilities:
 * - Get user notifications
 * - Mark notifications as read
 * - Notification settings
 *
 * Dependencies:
 * - Auth Module (for authentication)
 *
 * Uses:
 * - Socket.IO for real-time notifications
 */

export { NotificationService } from './services/notification.service'
export { NotificationController } from './controllers/notification.controller'
export { createNotificationRoutes } from './routes/notification.routes'
export type * from './types'
