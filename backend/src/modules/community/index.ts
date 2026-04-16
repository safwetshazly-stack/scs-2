/**
 * Community Module
 *
 * Public API for communities and social features
 *
 * Responsibilities:
 * - Community management
 * - Channels within communities
 * - Posts and discussions
 * - Community membership
 *
 * Dependencies:
 * - Auth Module (for authentication)
 * - User Module (for user info)
 */

export { CommunityService } from './services/community.service'
export { CommunityController } from './controllers/community.controller'
export { createCommunityRoutes } from './routes/community.routes'
export type { Community, Post, Channel } from './types'
