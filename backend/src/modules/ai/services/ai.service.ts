/**
 * AI Service
 * Handles AI-powered features: chat, recommendations, content generation
 */

import { PrismaClient } from '@prisma/client'
import { RedisClientType } from 'redis'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export class AiService {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisClientType
  ) {}

  /**
   * Check AI usage limits
   */
  async checkUsageLimit(userId: string) {
    const usage = await this.prisma.aiUsage.findUnique({
      where: { userId },
    })

    if (!usage) {
      throw new AppError('Usage not found', 404)
    }

    // Check if reset needed
    if (usage.resetAt < new Date()) {
      await this.prisma.aiUsage.update({
        where: { userId },
        data: {
          tokensUsedThisMonth: 0,
          requestsThisMonth: 0,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      return {
        canUse: true,
        tokensRemaining: usage.monthlyTokenLimit,
        requestsRemaining: usage.monthlyRequestLimit,
      }
    }

    const tokensRemaining = usage.monthlyTokenLimit - usage.tokensUsedThisMonth
    const requestsRemaining = usage.monthlyRequestLimit - usage.requestsThisMonth

    return {
      canUse: tokensRemaining > 0 && requestsRemaining > 0,
      tokensRemaining: Math.max(0, tokensRemaining),
      requestsRemaining: Math.max(0, requestsRemaining),
    }
  }

  /**
   * Record AI usage
   */
  async recordUsage(userId: string, tokensUsed: number) {
    await this.prisma.aiUsage.update({
      where: { userId },
      data: {
        tokensUsedThisMonth: { increment: tokensUsed },
        requestsThisMonth: { increment: 1 },
      },
    })

    logger.info(`AI usage recorded: ${userId} - ${tokensUsed} tokens`)
  }

  /**
   * Save AI request to history
   */
  async saveRequest(userId: string, data: { request: string; response: string; provider: string; tokensUsed: number }) {
    const history = await this.prisma.aiRequestHistory.create({
      data: {
        userId,
        request: data.request,
        response: data.response,
        provider: data.provider,
        tokensUsed: data.tokensUsed,
      },
    })

    logger.info(`AI request saved: ${userId}`)
    return history
  }

  /**
   * Get AI request history
   */
  async getHistory(userId: string, limit = 20, offset = 0) {
    const [history, total] = await Promise.all([
      this.prisma.aiRequestHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.aiRequestHistory.count({ where: { userId } }),
    ])

    return { history, total }
  }

  /**
   * Clear history
   */
  async clearHistory(userId: string) {
    await this.prisma.aiRequestHistory.deleteMany({
      where: { userId },
    })

    logger.info(`AI history cleared: ${userId}`)
  }

  /**
   * Get AI recommendations (for courses, content, etc.)
   */
  async getRecommendations(userId: string, type: string, limit = 10) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: { include: { course: { select: { category: true } } } },
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Get user's preferred categories
    const categories = user.enrollments.map((e) => e.course.category).filter(Boolean) as string[]

    if (type === 'courses') {
      const recommendations = await this.prisma.course.findMany({
        where: {
          status: 'PUBLISHED',
          NOT: {
            enrollments: { some: { userId } },
          },
          category: categories.length > 0 ? { in: categories } : undefined,
        },
        include: {
          instructor: { select: { username: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { studentsCount: 'desc' },
        take: limit,
      })

      return recommendations
    }

    return []
  }
}
