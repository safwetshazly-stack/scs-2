/**
 * SHARED Auth Middleware
 * 
 * This middleware is used by ALL modules for authentication and authorization
 * Located in shared layer because it's used across all domains
 * 
 * DO NOT move this file to a specific module
 * Register once in server.ts and all routes inherit it
 */

import { Request, Response, NextFunction } from 'express'
import { redis } from '../database/redis'
import { AppError } from '../utils/errors'
import { verifyToken } from '../utils/jwt'
import { logger } from '../utils/logger'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: 'ADMIN' | 'TEACHER' | 'CREATOR' | 'NORMAL'
        subscriptionTier: 'FREE' | 'PRO' | 'ENTERPRISE'
        email: string
        isBanned: boolean
      }
    }
  }
}

/**
 * Main authentication middleware
 * Validates JWT token and loads user info from cache
 * 
 * Usage: app.use(authenticate)
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      throw new AppError('No token provided', 401)
    }

    const payload = verifyToken(token)
    if (!payload) {
      throw new AppError('Invalid token', 401)
    }

    // Try to load user from cache first
    const cacheKey = `auth:user:${payload.id}`
    let user = await redis.get(cacheKey)
    let userData

    if (user) {
      userData = JSON.parse(user)
    } else {
      // Cache miss - user info would be fetched from DB in actual implementation
      // For now, we reconstruct from token
      userData = payload
      
      // Cache for 1 hour
      await redis.setEx(cacheKey, 3600, JSON.stringify(userData))
    }

    // Check if user is banned
    if (userData.isBanned) {
      throw new AppError('User account is banned', 403)
    }

    req.user = userData
    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message })
    } else {
      res.status(401).json({ message: 'Authentication failed' })
    }
  }
}

/**
 * Optional authentication middleware
 * Loads user info if token present, continues if not
 * 
 * Usage: optionalAuth, getProfile
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return next()
    }

    const payload = verifyToken(token)
    if (!payload) {
      return next()
    }

    const cacheKey = `auth:user:${payload.id}`
    let user = await redis.get(cacheKey)
    let userData

    if (user) {
      userData = JSON.parse(user)
    } else {
      userData = payload
      await redis.setEx(cacheKey, 3600, JSON.stringify(userData))
    }

    if (!userData.isBanned) {
      req.user = userData
    }

    next()
  } catch (error) {
    logger.warn('Optional auth error, continuing without auth:', error)
    next()
  }
}

/**
 * Role-based access control
 * 
 * Usage: requireRole('TEACHER', 'ADMIN')
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        message: `Requires one of these roles: ${roles.join(', ')}` 
      })
      return
    }

    next()
  }
}

/**
 * Admin-only access
 */
export const requireAdmin = requireRole('ADMIN')

/**
 * Teacher-only access
 */
export const requireTeacher = requireRole('TEACHER')

/**
 * Creator-only access
 */
export const requireCreator = requireRole('CREATOR')

/**
 * Creator or Teacher access
 */
export const requireInstructor = requireRole('TEACHER', 'CREATOR')

/**
 * Subscription-level access
 * 
 * Usage: requireSubscription('PRO', 'ENTERPRISE')
 */
export function requireSubscription(...tiers: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' })
      return
    }

    if (!tiers.includes(req.user.subscriptionTier)) {
      res.status(403).json({
        message: `Requires one of these subscription tiers: ${tiers.join(', ')}`
      })
      return
    }

    next()
  }
}

export default authenticate
