import { PrismaClient, SubscriptionTier } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import StreamingTokenService from './streaming-token.service'
import SecurityLogService from './security-log.service'

export class SecurityGuardService {
  constructor(
    private prisma: PrismaClient,
    private streamingTokenService: StreamingTokenService,
    private securityLogService: SecurityLogService
  ) {}

  /**
   * Assert that user owns/has access to resource
   */
  async assertOwnership(userId: string, resourceType: string, resourceId: string): Promise<void> {
    try {
      let isOwned = false

      switch (resourceType.toUpperCase()) {
        case 'COURSE': {
          const enrollment = await this.prisma.courseEnrollment.findFirst({
            where: { userId, courseId: resourceId },
          })
          isOwned = !!enrollment
          break
        }

        case 'BOOK': {
          const purchase = await this.prisma.bookPurchase.findFirst({
            where: { userId, bookId: resourceId },
          })
          isOwned = !!purchase
          break
        }

        case 'VIDEO': {
          const video = await this.prisma.video.findUnique({
            where: { id: resourceId },
          })
          if (video) {
            const lesson = await this.prisma.courseLesson.findUnique({
              where: { id: video.lessonId },
            })
            if (lesson) {
              const courseModule = await this.prisma.courseModule.findUnique({
                where: { id: lesson.moduleId },
              })
              if (courseModule) {
                const enrollment = await this.prisma.courseEnrollment.findFirst({
                  where: { userId, courseId: courseModule.courseId },
                })
                isOwned = !!enrollment
              }
            }
          }
          break
        }

        default:
          throw new AppError('Invalid resource type', 400)
      }

      if (!isOwned) {
        logger.warn(`Ownership assertion failed: user ${userId} does not have access to ${resourceType} ${resourceId}`)
        throw new AppError('You do not have access to this resource', 403)
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error asserting ownership:', error)
      throw new AppError('Failed to verify ownership', 500)
    }
  }

  /**
   * Assert that user has required subscription tier
   */
  async assertSubscription(userId: string, requiredTier: SubscriptionTier | SubscriptionTier[]): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new AppError('User not found', 404)
      }

      const requiredTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier]
      const tierHierarchy = { FREE: 0, SILVER: 1, GOLD: 2 }

      const userTierLevel = tierHierarchy[user.subscriptionTier]
      const requiredTierLevel = Math.max(...requiredTiers.map((t) => tierHierarchy[t]))

      if (userTierLevel < requiredTierLevel) {
        logger.warn(`Subscription assertion failed: user ${userId} tier ${user.subscriptionTier} < required ${requiredTiers.join(',')}`)
        throw new AppError('Your subscription tier does not allow this action', 403)
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error asserting subscription:', error)
      throw new AppError('Failed to verify subscription', 500)
    }
  }

  /**
   * Assert that device is valid and registered
   */
  async assertDevice(userId: string, deviceId: string): Promise<void> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      })

      if (!device) {
        throw new AppError('Device not found', 404)
      }

      if (device.userId !== userId) {
        logger.warn(`Device assertion failed: device ${deviceId} does not belong to user ${userId}`)
        throw new AppError('Device does not belong to this user', 403)
      }

      // Update last active
      await this.prisma.device.update({
        where: { id: deviceId },
        data: { lastActiveAt: new Date() },
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error asserting device:', error)
      throw new AppError('Failed to verify device', 500)
    }
  }

  /**
   * Assert that streaming token is valid
   */
  async assertStreamingToken(token: string, userId: string, deviceId: string, resourceId: string): Promise<void> {
    const isValid = await this.streamingTokenService.validateStreamingToken({
      token,
      userId,
      deviceId,
      resourceId,
    })

    if (!isValid) {
      logger.warn(`Streaming token assertion failed for user: ${userId}, device: ${deviceId}`)
      throw new AppError('Invalid or expired streaming token', 401)
    }
  }

  /**
   * Assert that download is allowed (not too many concurrent downloads)
   */
  async assertDownloadAllowed(userId: string, deviceId: string): Promise<void> {
    try {
      // Check concurrent downloads on device
      const recentDownloads = await this.prisma.downloadLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000), // Last minute
          },
        },
      })

      if (recentDownloads.length > 10) {
        logger.warn(`Download rate exceeded for user: ${userId}`)
        throw new AppError('Too many downloads. Please wait a moment.', 429)
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error asserting download allowed:', error)
      throw new AppError('Failed to verify download allowance', 500)
    }
  }

  /**
   * Assert that user has not triggered security alerts
   */
  async assertSecurityClear(userId: string): Promise<void> {
    try {
      const recentAlerts = await this.prisma.securityLog.findMany({
        where: {
          userId,
          isResolved: false,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      })

      // Check for high-risk unresolved alerts
      const highRiskAlert = recentAlerts.find((alert) => alert.riskScore > 70)

      if (highRiskAlert) {
        logger.warn(`High-risk security alert blocks action for user: ${userId}`)
        throw new AppError(
          'Your account has security restrictions. Please verify your identity.',
          403
        )
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error asserting security clear:', error)
      throw new AppError('Failed to verify security status', 500)
    }
  }

  /**
   * Assert that user can make purchase
   */
  async assertPurchaseAllowed(userId: string, amount: number): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      })

      if (!user) {
        throw new AppError('User not found', 404)
      }

      // Check security
      await this.assertSecurityClear(userId)

      // Check wallet
      if (user.walletBalance < amount) {
        throw new AppError('Insufficient balance', 402)
      }

      // Check for rapid purchases
      const recentPurchases = await this.prisma.payment.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      })

      if (recentPurchases.length > 10) {
        logger.warn(`Rapid purchases detected for user: ${userId}`)
        throw new AppError('Too many purchases in a short time. Please try again later.', 429)
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error asserting purchase allowed:', error)
      throw new AppError('Failed to verify purchase eligibility', 500)
    }
  }

  /**
   * Assert AI usage is allowed
   */
  async assertAiUsageAllowed(userId: string, tokensRequested: number): Promise<void> {
    try {
      const aiUsage = await this.prisma.aiUsage.findUnique({
        where: { userId },
      })

      if (!aiUsage) {
        throw new AppError('AI usage record not found', 404)
      }

      // Get subscription tier limits
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      })

      if (!user) {
        throw new AppError('User not found', 404)
      }

      const limits: Record<string, number> = {
        FREE: 2000,
        SILVER: 10000,
        GOLD: 50000,
      }

      const tokenLimit = limits[user.subscriptionTier] || 0

      // Check if reset is needed
      const now = new Date()
      if (now > aiUsage.resetAt) {
        // Reset usage
        await this.prisma.aiUsage.update({
          where: { userId },
          data: {
            tokensUsed: tokensRequested,
            requestCount: 1,
            resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
        return
      }

      // Check limit
      if (aiUsage.tokensUsed + tokensRequested > tokenLimit) {
        logger.warn(`AI usage limit exceeded for user: ${userId}`)
        throw new AppError('AI token limit exceeded for this billing period', 429)
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error asserting AI usage allowed:', error)
      throw new AppError('Failed to verify AI usage allowance', 500)
    }
  }
}

export default SecurityGuardService
