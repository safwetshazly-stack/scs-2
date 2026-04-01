import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma, redis } from '../server'
import { env } from '../config/env'
import { AppError } from '../utils/errors'

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; subscriptionTier: string }
    }
  }
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401)
    }

    const token = authHeader.split(' ')[1]
    if (!token) throw new AppError('Token missing', 401)

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`)
    if (isBlacklisted) throw new AppError('Token has been invalidated', 401)

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: string; subscriptionTier: string; iat: number }

    // Check cached user first
    const cached = await redis.get(`user:${payload.userId}`)
    if (cached) {
      const userData = JSON.parse(cached)
      req.user = { id: userData.id, role: userData.role, subscriptionTier: userData.subscriptionTier }
      return next()
    }

    // Fallback to DB
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, subscriptionTier: true, isBanned: true, isActive: true },
    })

    if (!user) throw new AppError('User not found', 401)
    if (user.isBanned) throw new AppError('Account banned', 403)
    if (!user.isActive) throw new AppError('Account deactivated', 403)

    req.user = { id: user.id, role: user.role, subscriptionTier: user.subscriptionTier }

    // Refresh cache
    await redis.setEx(`user:${user.id}`, 3600, JSON.stringify({ id: user.id, role: user.role, subscriptionTier: user.subscriptionTier }))

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

// ─── OPTIONAL AUTH ────────────────────────────────────────
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return next()

    const token = authHeader.split(' ')[1]
    if (!token) return next()

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: string }
    req.user = { id: payload.userId, role: payload.role }
    next()
  } catch {
    next()
  }
}

// ─── ROLE GUARDS ──────────────────────────────────────────
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
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

export const requireSubscription = (...tiers: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('Authentication required', 401)
    if (req.user.role === 'ADMIN') return next()
    if (!tiers.includes(req.user.subscriptionTier)) {
      throw new AppError('Subscription required for this feature', 403)
    }
    next()
  }
}

// ─── CSRF PROTECTION ──────────────────────────────────────
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) return next()

  const csrfToken = req.headers['x-csrf-token'] as string
  const origin = req.headers.origin
  const host = `${req.protocol}://${req.hostname}`

  const validOrigins = [env.FRONTEND_URL, env.MOBILE_URL].filter(Boolean)

  if (!origin || !validOrigins.includes(origin)) {
    throw new AppError('CSRF validation failed', 403)
  }

  next()
}
