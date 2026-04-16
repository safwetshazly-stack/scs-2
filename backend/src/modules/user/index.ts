/**
 * User Module
 *
 * Public API for user profile and account management
 *
 * Responsibilities:
 * - User profiles and settings
 * - Social features (follow, block)
 * - User search and discovery
 *
 * Dependencies:
 * - Auth Module (for authentication)
 *
 * Cannot access:
 * - Auth tokens or password hashes
 * - Payment data
 * - Course enrollment data (use Course module for that)
 */

export { UserService } from './services/user.service'
export { UserController } from './controllers/user.controller'
export { createUserRoutes } from './routes/user.routes'
export type * from './types'
export type { UserProfile, UserSettings } from './types'
export { UserService } from './services/user.service'
export { UserController } from './controllers/user.controller'
