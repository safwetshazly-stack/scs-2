/**
 * Auth Service
 * 
 * Handles all authentication logic:
 * - User registration
 * - Login with brute force protection
 * - Token management
 * - Email verification
 * - Password reset
 */

import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { PrismaClient } from '@prisma/client'
import { RedisClient } from '../../../shared/database/redis'
import { generateTokens, verifyRefreshToken } from '../../../utils/jwt'
import { sendVerificationEmail, sendPasswordResetEmail } from '../../../utils/email'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

const SALT_ROUNDS = 12
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 15 * 60 // 15 minutes in seconds

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisClient
  ) {}

  /**
   * Register new user
   */
  async register(username: string, email: string, password: string, role?: string) {
    // Check duplicates
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase().trim() }, { username }] },
      select: { id: true, email: true, username: true },
    })

    if (existing) {
      throw new AppError(
        `This ${existing.email === email.toLowerCase().trim() ? 'email' : 'username'} is already taken.`,
        409
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // Create user + profile + settings atomically
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email: email.toLowerCase().trim(),
          passwordHash,
          role: role === 'TEACHER' ? 'TEACHER' : 'NORMAL',
          subscriptionTier: 'FREE',
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

    // Send verification email
    const verifyToken = uuidv4()
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verifyToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await sendVerificationEmail(user.email, verifyToken, user.username)
    logger.info(`User registered: ${user.email}`)

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  }

  /**
   * Login user with brute force protection
   */
  async login(email: string, password: string, ipAddress: string) {
    email = email.toLowerCase().trim()
    const lockKey = `login_lock:${email}`
    const attemptsKey = `login_attempts:${email}`

    // Check if account is locked
    const isLocked = await this.redis.get(lockKey)
    if (isLocked) {
      throw new AppError('Account temporarily locked. Try again in 15 minutes.', 429)
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true, settings: true },
    })

    // Verify password
    const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false

    // Log attempt
    await this.prisma.loginAttempt.create({
      data: {
        userId: user?.id,
        email,
        ipAddress,
        success: isValid,
      },
    })

    // Handle failed attempt
    if (!isValid || !user) {
      const attempts = await this.redis.incr(attemptsKey)
      await this.redis.expire(attemptsKey, LOCK_TIME)

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await this.redis.setEx(lockKey, LOCK_TIME, '1')
        await this.redis.del(attemptsKey)
      }

      throw new AppError('Invalid email or password.', 401)
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new AppError(`Account banned. Reason: ${user.banReason || 'Terms violation'}`, 403)
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new AppError('Verify your email before logging in.', 403)
    }

    // Clear brute force attempts
    await this.redis.del(attemptsKey)
    await this.redis.del(lockKey)

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.subscriptionTier)

    // Create session
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        token: refreshToken,
        deviceInfo: '',
        ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // Update last login and cache
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    await this.redis.setEx(
      `user:${user.id}`,
      3600,
      JSON.stringify({
        id: user.id,
        role: user.role,
        username: user.username,
      })
    )

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.profile?.avatar,
      },
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(token: string, ipAddress: string) {
    if (!token) throw new AppError('Refresh token required', 400)

    const payload = verifyRefreshToken(token)

    const session = await this.prisma.userSession.findFirst({
      where: { token, isValid: true, userId: payload.userId },
    })

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Invalid or expired session', 401)
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, subscriptionTier: true, isBanned: true },
    })

    if (!user || user.isBanned) throw new AppError('User not found or banned', 401)

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user.id,
      user.role,
      user.subscriptionTier
    )

    // Rotate refresh token
    await this.prisma.$transaction([
      this.prisma.userSession.update({ where: { id: session.id }, data: { isValid: false } }),
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          deviceInfo: session.deviceInfo,
          ipAddress,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ])

    return {
      accessToken,
      refreshToken: newRefreshToken,
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, token?: string) {
    if (token) {
      await this.prisma.userSession.updateMany({
        where: { token, userId },
        data: { isValid: false },
      })
    }

    await this.redis.del(`user:${userId}`)
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!verification) {
      throw new AppError('Invalid or expired token', 400)
    }

    if (verification.expiresAt < new Date()) {
      throw new AppError('Token expired', 400)
    }

    // Mark email as verified
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerification.delete({ where: { id: verification.id } }),
    ])

    logger.info(`Email verified: ${verification.user.email}`)
    return verification.user
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      // Don't reveal if user exists
      logger.info(`Password reset requested for non-existent email: ${email}`)
      return
    }

    const resetToken = uuidv4()
    // PasswordReset has no userId unique constraint, use findFirst + create/update
    const existing = await this.prisma.passwordReset.findFirst({ where: { userId: user.id } })
    if (existing) {
      await this.prisma.passwordReset.update({
        where: { id: existing.id },
        data: {
          token: resetToken,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
          used: false,
        },
      })
    } else {
      await this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        },
      })
    }

    await sendPasswordResetEmail(user.email, resetToken, user.username)
    logger.info(`Password reset email sent: ${user.email}`)
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!reset) {
      throw new AppError('Invalid or expired token', 400)
    }

    if (reset.expiresAt < new Date()) {
      throw new AppError('Token expired', 400)
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.delete({ where: { id: reset.id } }),
    ])

    logger.info(`Password reset: ${reset.user.email}`)
  }

  /**
   * Get user from decoded token payload
   * Used by auth middleware - handles cache, DB fallback, ban/active checks
   */
  async getUserFromToken(payload: { userId: string; role: string; subscriptionTier: string }, token?: string) {
    // Check if token is blacklisted
    if (token) {
      const isBlacklisted = await this.redis.get(`blacklist:${token}`)
      if (isBlacklisted) throw new AppError('Token has been invalidated', 401)
    }

    // Try cache first
    const cacheKey = `auth:user:${payload.userId}`
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      const userData = JSON.parse(cached)
      if (userData.isBanned) throw new AppError('Account banned', 403)
      return { id: userData.id, role: userData.role, subscriptionTier: userData.subscriptionTier }
    }

    // Fallback to DB
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, subscriptionTier: true, isBanned: true, isActive: true },
    })

    if (!user) throw new AppError('User not found', 401)
    if (user.isBanned) throw new AppError('Account banned', 403)
    if (!user.isActive) throw new AppError('Account deactivated', 403)

    const userData = { id: user.id, role: user.role, subscriptionTier: user.subscriptionTier }

    // Refresh cache
    await this.redis.setEx(cacheKey, 3600, JSON.stringify({ ...userData, isBanned: user.isBanned }))

    return userData
  }

  /**
   * Get current user
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        settings: true,
        _count: {
          select: {
            followers: true,
            following: true,
            enrollments: true,
          },
        },
      },
    })

    if (!user) throw new AppError('User not found', 404)
    return user
  }
}
