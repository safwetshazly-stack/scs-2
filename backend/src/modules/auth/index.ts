/**
 * Auth Module
 *
 * Public API for authentication and authorization
 *
 * Responsibilities:
 * - User registration and login
 * - JWT token management
 * - Session management
 * - Password reset
 *
 * Dependencies: None (base module)
 * Used by: All other modules
 */

export { AuthService } from './services/auth.service'
export { AuthController } from './controllers/auth.controller'
export { createAuthRoutes } from './routes/auth.routes'
export { authenticate, optionalAuth, requireRole, requireAdmin, requireTeacher, requireInstructor, requireCreator } from '../../../middlewares/auth.middleware'
export type { AuthPayload, RegisterRequest, LoginRequest } from './types'
