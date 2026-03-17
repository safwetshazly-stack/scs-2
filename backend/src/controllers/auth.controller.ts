import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { prisma, redis } from '../server'
import { env } from '../config/env'
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'
import { generateTokens, verifyRefreshToken } from '../utils/jwt'

const SALT_ROUNDS = 12
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 15 * 60 // 15 min in seconds

// ─── REGISTER ─────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, role } = req.body

    // Check duplicates
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true, email: true, username: true },
    })

    if (existing) {
      const field = existing.email === email ? 'email' : 'username'
      throw new AppError(`This ${field} is already taken.`, 409)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // Create user + profile + settings atomically
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email: email.toLowerCase().trim(),
          passwordHash,
          role: role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'USER',
        },
      })

      await tx.userProfile.create({ data: { userId: newUser.id } })
      await tx.userSettings.create({ data: { userId: newUser.id } })
      await tx.notificationSettings.create({ data: { userId: newUser.id } })
      await tx.aiUsage.create({
        data: {
          userId: newUser.id,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      return newUser
    })

    // Email verification
    const verifyToken = uuidv4()
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verifyToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await sendVerificationEmail(user.email, verifyToken, user.username)

    logger.info(`New user registered: ${user.email}`)

    res.status(201).json({
      message: 'Account created! Please check your email to verify.',
    })
  } catch (error) {
    next(error)
  }
}

// ─── LOGIN ────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body
    const ip = req.ip || 'unknown'

    // Check brute force via Redis
    const lockKey = `login_lock:${email}`
    const attemptsKey = `login_attempts:${email}`

    const isLocked = await redis.get(lockKey)
    if (isLocked) {
      throw new AppError('Account temporarily locked due to too many failed attempts. Try again in 15 minutes.', 429)
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { profile: true, settings: true },
    })

    const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false

    // Log attempt
    await prisma.loginAttempt.create({
      data: {
        userId: user?.id,
        email: email.toLowerCase(),
        ipAddress: ip,
        success: isValid,
      },
    })

    if (!isValid || !user) {
      const attempts = await redis.incr(attemptsKey)
      await redis.expire(attemptsKey, LOCK_TIME)

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await redis.setEx(lockKey, LOCK_TIME, '1')
        await redis.del(attemptsKey)
      }

      throw new AppError('Invalid email or password.', 401)
    }

    if (user.isBanned) {
      throw new AppError(`Your account has been banned. Reason: ${user.banReason || 'Violation of terms'}`, 403)
    }

    if (!user.emailVerified) {
      throw new AppError('Please verify your email before logging in.', 403)
    }

    // Clear brute force
    await redis.del(attemptsKey)
    await redis.del(lockKey)

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role)

    // Store session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: refreshToken,
        deviceInfo: req.headers['user-agent'],
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Cache user in Redis
    await redis.setEx(`user:${user.id}`, 3600, JSON.stringify({
      id: user.id,
      role: user.role,
      username: user.username,
    }))

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.profile?.avatar,
        emailVerified: user.emailVerified,
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── REFRESH TOKEN ────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body
    if (!token) throw new AppError('Refresh token required', 400)

    const payload = verifyRefreshToken(token)

    const session = await prisma.userSession.findFirst({
      where: { token, isValid: true, userId: payload.userId },
    })

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Invalid or expired session', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isBanned: true },
    })

    if (!user || user.isBanned) throw new AppError('User not found or banned', 401)

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role)

    // Rotate refresh token
    await prisma.$transaction([
      prisma.userSession.update({ where: { id: session.id }, data: { isValid: false } }),
      prisma.userSession.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          deviceInfo: session.deviceInfo,
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ])

    res.json({ accessToken, refreshToken: newRefreshToken })
  } catch (error) {
    next(error)
  }
}

// ─── LOGOUT ───────────────────────────────────────────────
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body
    const userId = req.user?.id

    if (token) {
      await prisma.userSession.updateMany({
        where: { token, userId },
        data: { isValid: false },
      })
    }

    if (userId) {
      await redis.del(`user:${userId}`)
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}

// ─── VERIFY EMAIL ─────────────────────────────────────────
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params

    const verification = await prisma.emailVerification.findFirst({
      where: { token, used: false },
    })

    if (!verification) throw new AppError('Invalid verification token', 400)
    if (verification.expiresAt < new Date()) throw new AppError('Verification token expired', 400)

    await prisma.$transaction([
      prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: true } }),
      prisma.emailVerification.update({ where: { id: verification.id }, data: { used: true } }),
    ])

    res.json({ message: 'Email verified successfully!' })
  } catch (error) {
    next(error)
  }
}

// ─── FORGOT PASSWORD ──────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, username: true },
    })

    // Always respond same to prevent user enumeration
    if (!user) {
      return res.json({ message: 'If this email exists, you will receive a reset link.' })
    }

    // Invalidate old tokens
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    })

    const resetToken = uuidv4()
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    await sendPasswordResetEmail(user.email, resetToken, user.username)

    res.json({ message: 'If this email exists, you will receive a reset link.' })
  } catch (error) {
    next(error)
  }
}

// ─── RESET PASSWORD ───────────────────────────────────────
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body

    const reset = await prisma.passwordReset.findFirst({
      where: { token, used: false },
    })

    if (!reset) throw new AppError('Invalid reset token', 400)
    if (reset.expiresAt < new Date()) throw new AppError('Reset token expired. Please request a new one.', 400)

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
      // Invalidate all sessions
      prisma.userSession.updateMany({ where: { userId: reset.userId }, data: { isValid: false } }),
    ])

    // Clear Redis cache
    await redis.del(`user:${reset.userId}`)

    res.json({ message: 'Password reset successfully!' })
  } catch (error) {
    next(error)
  }
}

// ─── GET ME ───────────────────────────────────────────────
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true,
        profile: true,
        settings: true,
        _count: {
          select: {
            followers: true,
            following: true,
            coursesCreated: true,
            enrollments: true,
          },
        },
      },
    })

    if (!user) throw new AppError('User not found', 404)

    res.json(user)
  } catch (error) {
    next(error)
  }
}
