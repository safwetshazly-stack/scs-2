import { PrismaClient, SubscriptionTier } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export class SubscriptionService {
  constructor(private prisma: PrismaClient) {}

  private readonly LIMITS = {
    FREE: {
      aiMonthlyRequests: 10,
      aiTokensPerRequest: 2000,
      toolUsageMonthly: 5,
      coursesViewable: 5,
      booksViewable: 5,
      showAds: true,
    },
    SILVER: {
      aiMonthlyRequests: 100,
      aiTokensPerRequest: 10000,
      toolUsageMonthly: 50,
      coursesViewable: 25,
      booksViewable: 25,
      showAds: true,
    },
    GOLD: {
      aiMonthlyRequests: 1000,
      aiTokensPerRequest: 50000,
      toolUsageMonthly: 500,
      coursesViewable: -1,
      booksViewable: -1,
      showAds: false,
    },
  }

  async assignPlan(userId: string, plan: SubscriptionTier) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: plan },
    })

    logger.info(`Plan assigned: ${userId} -> ${plan}`)
  }

  async getUserPlan(userId: string): Promise<SubscriptionTier> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    return user.subscriptionTier
  }

  async enforceLimits(userId: string, actionType: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    const limits = this.LIMITS[user.subscriptionTier as SubscriptionTier]

    switch (actionType) {
      case 'ai_request': {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const count = await this.prisma.aiMessage.count({
          where: {
            conversation: { userId },
            createdAt: { gte: monthStart },
            role: 'user',
          },
        })

        return count < limits.aiMonthlyRequests
      }

      case 'tool_usage': {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const count = await this.prisma.activityLog.count({
          where: {
            userId,
            action: 'tool_used',
            createdAt: { gte: monthStart },
          },
        })

        return count < limits.toolUsageMonthly
      }

      case 'view_course': {
        if (limits.coursesViewable === -1) return true

        const enrolled = await this.prisma.courseEnrollment.count({
          where: { userId },
        })

        return enrolled < limits.coursesViewable
      }

      case 'view_book': {
        if (limits.booksViewable === -1) return true

        const purchased = await this.prisma.bookPurchase.count({
          where: { userId },
        })

        return purchased < limits.booksViewable
      }

      default:
        throw new AppError('Unknown action type', 400)
    }
  }

  getLimits(tier: SubscriptionTier) {
    return this.LIMITS[tier]
  }

  shouldShowAds(tier: SubscriptionTier): boolean {
    return this.LIMITS[tier].showAds
  }

  getAiTokenLimit(tier: SubscriptionTier): number {
    return this.LIMITS[tier].aiTokensPerRequest
  }
}
