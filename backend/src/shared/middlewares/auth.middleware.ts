/**
 * SHARED Auth Middleware
 * 
 * This middleware is used by ALL modules for authentication and authorization.
 * Located in shared layer because it's used across all domains.
 * 
 * RULES:
 * - Middleware ONLY decodes JWT tokens and calls AuthService
 * - NO direct database (Prisma) access
 * - NO direct Redis access
 * - All user lookups delegated to AuthService.getUserFromToken()
 * 
 * DO NOT move this file to a specific module.
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { AppError } from '../../utils/errors'
import { AuthService } from '../../modules/auth/services/auth.service'
import { prisma } from '../database/prisma'
import { redis } from '../database/redis'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: string
        subscriptionTier: string
      }
    }
  }
}

// Singleton AuthService instance for middleware use
const authService = new AuthService(prisma, redis)

/**
 * Main authentication middleware
 * Decodes JWT token and delegates user lookup to AuthService
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401)
    }

    const token = authHeader.split(' ')[1]
    if (!token) throw new AppError('Token missing', 401)

    // Decode JWT only
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: string
      role: string
      subscriptionTier: string
    }

    // Delegate all DB/cache logic to AuthService
    const user = await authService.getUserFromToken(payload, token)

    req.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401))
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401))
    }
    next(error)
  }
}

/**
 * Optional authentication middleware
 * Decodes token if present, continues without auth if not
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return next()

    const token = authHeader.split(' ')[1]
    if (!token) return next()

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: string
      role: string
      subscriptionTier: string
    }

    const user = await authService.getUserFromToken(payload, token)
    req.user = user
    next()
  } catch {
    // Optional auth - continue without user on any error
    next()
  }
}

/**
 * Role-based access control
 * 
 * Usage: requireRole('TEACHER', 'ADMIN')
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('Authentication required', 401)
    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403)
    }
    next()
  }
}

export const requireAdmin = requireRole('ADMIN')
export const requireTeacher = requireRole('TEACHER', 'ADMIN')
export const requireCreator = requireRole('CREATOR', 'ADMIN')
export const requireInstructor = requireRole('TEACHER', 'ADMIN')

/**
 * Subscription-level access
 * 
 * Usage: requireSubscription('PRO', 'ENTERPRISE')
 */
export function requireSubscription(...tiers: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('Authentication required', 401)
    if (req.user.role === 'ADMIN') return next()
    if (!tiers.includes(req.user.subscriptionTier)) {
      throw new AppError('Subscription required for this feature', 403)
    }
    next()
  }
}

export default authenticate
