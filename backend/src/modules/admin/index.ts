/**
 * Admin Module
 *
 * Public API for administration features
 *
 * Responsibilities:
 * - System statistics
 * - User management (ban, unban)
 * - Content moderation
 * - System health monitoring
 *
 * Dependencies:
 * - Auth Module (for admin authentication)
 *
 * Access:
 * - Read-only access to all modules for statistics
 * - Can modify user status across all modules
 */

export { AdminService } from './services/admin.service'
export { AdminController } from './controllers/admin.controller'
export { createAdminRoutes } from './routes/admin.routes'
