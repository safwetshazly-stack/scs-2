/**
 * AI Orchestrator
 * Coordinates AI usage flow: subscription verification → limit checking → deduction → usage logging
 * Enforces subscription tier limits and prevents overage
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { SubscriptionService } from '../../subscription/services/subscription.service'
import { AiService } from '../../ai/services/ai.service'

export interface AiUsageRequest {
  userId: string
  tokensRequested: number
}

export interface AiUsageResponse {
  allowed: true
  tokensAllocated: number
  tokensRemaining: number
  requestsRemaining: number
}

export class AiOrchestrator {
  constructor(
    private prisma: PrismaClient,
    private subscriptionService: SubscriptionService,
    private aiService: AiService
  ) {}

  /**
   * Request AI Usage
   * 1. Get user subscription tier
   * 2. Check monthly usage limits
   * 3. Check token limits
   * 4. Deduct usage from quota
   * 5. Return usage allowance
   */
  async requestAiUsage(request: AiUsageRequest): Promise<AiUsageResponse> {
    const { userId, tokensRequested } = request

    // 1. Validate user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // 2. Get user subscription tier and limits
    const tier = user.subscriptionTier
    const limits = this.subscriptionService.getLimits(tier)

    // 3. Get or create AI usage record
    let usage = await this.prisma.aiUsage.findUnique({ where: { userId } })

    if (!usage) {
      // Create new usage record
      usage = await this.prisma.aiUsage.create({
        data: {
          userId,
          tokensUsed: 0,
          requestCount: 0,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      })
    }

    // 4. Check if monthly reset is needed
    if (usage.resetAt <= new Date()) {
      // Reset usage
      usage = await this.prisma.aiUsage.update({
        where: { userId },
        data: {
          tokensUsed: 0,
          requestCount: 0,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      logger.info(`AI usage reset: ${userId}`)
    }

    // 5. Check request count limit
    if (usage.requestCount >= limits.aiMonthlyRequests) {
      throw new AppError(
        `AI request limit exceeded (${limits.aiMonthlyRequests}/month). Upgrade your plan.`,
        429
      )
    }

    // 6. Check token limit
    const tokensRemaining = limits.aiTokensPerRequest - usage.tokensUsed

    if (tokensRemaining <= 0) {
      throw new AppError(
        `AI token limit exceeded (${limits.aiTokensPerRequest}/month). Upgrade your plan.`,
        429
      )
    }

    // 7. Check requested tokens against available
    const tokensToAllocate = Math.min(tokensRequested, tokensRemaining)

    if (tokensToAllocate <= 0) {
      throw new AppError('Insufficient AI tokens for this request. Upgrade your plan.', 429)
    }

    // 8. Deduct usage (atomic transaction)
    const updatedUsage = await this.prisma.aiUsage.update({
      where: { userId },
      data: {
        tokensUsed: { increment: tokensToAllocate },
        requestCount: { increment: 1 },
      },
    })

    // 9. Log AI usage
    logger.info(`AI usage deducted: ${userId} - ${tokensToAllocate} tokens, Tier: ${tier}`)

    // Calculate remaining for response
    const newTokensRemaining = limits.aiTokensPerRequest - updatedUsage.tokensUsed
    const newRequestsRemaining = limits.aiMonthlyRequests - updatedUsage.requestCount

    return {
      allowed: true,
      tokensAllocated: tokensToAllocate,
      tokensRemaining: Math.max(0, newTokensRemaining),
      requestsRemaining: Math.max(0, newRequestsRemaining),
    }
  }

  /**
   * Complete AI Request (for mock execution)
   * 1. Call AiService with allocated tokens
   * 2. Log completion
   * 3. Return result
   */
  async executeAiRequest(userId: string, prompt: string, tokensAllocated: number) {
    // Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    try {
      // Mock AI execution (would call actual AI service in production)
      const response = await this.aiService.processRequest(userId, prompt, tokensAllocated)

      logger.info(`AI request completed: ${userId} - Used ${tokensAllocated} tokens`)

      return {
        success: true,
        response,
        tokensUsed: tokensAllocated,
      }
    } catch (error) {
      logger.error(`AI request failed: ${userId} - ${error}`)
      throw error
    }
  }

  /**
   * Get AI Usage Stats
   * Returns current usage and limits for user
   */
  async getUsageStats(userId: string) {
    // Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Get usage record
    let usage = await this.prisma.aiUsage.findUnique({ where: { userId } })

    if (!usage) {
      // Create new usage record if doesn't exist
      usage = await this.prisma.aiUsage.create({
        data: {
          userId,
          tokensUsed: 0,
          requestCount: 0,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    }

    // Get limits for tier
    const tier = user.subscriptionTier
    const limits = this.subscriptionService.getLimits(tier)

    // Check if reset needed
    let resetAt = usage.resetAt
    if (resetAt <= new Date()) {
      resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    return {
      tier,
      currentUsage: {
        tokensUsed: usage.tokensUsed,
        requestsUsed: usage.requestCount,
      },
      limits: {
        monthlyTokenLimit: limits.aiTokensPerRequest,
        monthlyRequestLimit: limits.aiMonthlyRequests,
      },
      remaining: {
        tokensRemaining: Math.max(0, limits.aiTokensPerRequest - usage.tokensUsed),
        requestsRemaining: Math.max(0, limits.aiMonthlyRequests - usage.requestCount),
      },
      resetAt,
      percentageUsed: Math.round((usage.tokensUsed / limits.aiTokensPerRequest) * 100),
    }
  }

  /**
   * Check if user can make AI request
   */
  async canMakeAiRequest(userId: string, tokensNeeded = 100): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return false
      }

      const usage = await this.prisma.aiUsage.findUnique({ where: { userId } })
      if (!usage) {
        return true // New user can make first request
      }

      const limits = this.subscriptionService.getLimits(user.subscriptionTier)

      // Check if reset needed
      if (usage.resetAt <= new Date()) {
        return true // Can use after reset
      }

      const canUseTokens = usage.tokensUsed + tokensNeeded <= limits.aiTokensPerRequest
      const canUseRequest = usage.requestCount < limits.aiMonthlyRequests

      return canUseTokens && canUseRequest
    } catch {
      return false
    }
  }

  /**
   * Upgrade subscription tier
   * Resets usage counters when upgrading
   */
  async upgradeTier(userId: string, newTier: string) {
    // Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Update user tier
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: newTier as any },
    })

    // Reset AI usage for new tier
    await this.prisma.aiUsage.upsert({
      where: { userId },
      update: {
        tokensUsed: 0,
        requestCount: 0,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId,
        tokensUsed: 0,
        requestCount: 0,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    logger.info(`Subscription upgraded: ${userId} -> ${newTier}`)

    return { success: true, newTier }
  }
}
