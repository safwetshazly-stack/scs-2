/**
 * Platform Module
 *
 * Public API for platform management
 *
 * Responsibilities:
 * - Platform creation and management
 * - Platform settings
 * - Creator platforms
 *
 * Dependencies:
 * - Auth Module (for authentication)
 * - User Module (for user info)
 */

export { PlatformService } from './services/platform.service'
export { PlatformController } from './controllers/platform.controller'
export { createPlatformRoutes } from './routes/platform.routes'
export { WebhookService } from './services/webhook.service'
export type { Platform } from './types'
