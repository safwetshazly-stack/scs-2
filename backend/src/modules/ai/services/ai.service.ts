/**
 * AI Service
 * Handles AI-powered features: chat, recommendations, content generation
 */

import { PrismaClient } from '@prisma/client'
import { RedisClient } from '../../../shared/database/redis'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { SubscriptionService } from '../../subscription/services/subscription.service'

// Default limits (could be moved to config/subscription plan)
const DEFAULT_TOKEN_LIMIT = 100000
const DEFAULT_REQUEST_LIMIT = 500

export class AiService {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisClient,
    private subscriptionService: SubscriptionService
  ) {}

  /**
   * Check AI usage limits against subscription tier
   */
  async checkUsageLimit(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Get subscription limits
    const limits = this.subscriptionService.getLimits(user.subscriptionTier)
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
          tokensUsed: 0,
          requestCount: 0,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      return {
        canUse: true,
        tokensRemaining: limits.aiTokensPerRequest,
        requestsRemaining: limits.aiMonthlyRequests,
      }
    }

    const tokensRemaining = limits.aiTokensPerRequest - usage.tokensUsed
    const requestsRemaining = limits.aiMonthlyRequests - usage.requestCount

    return {
      canUse: tokensRemaining > 0 && requestsRemaining > 0,
      tokensRemaining: Math.max(0, tokensRemaining),
      requestsRemaining: Math.max(0, requestsRemaining),
    }
  }

  /**
   * Check and enforce AI limits before request
   */
  async enforceAiLimit(userId: string) {
    const canUse = await this.subscriptionService.enforceLimits(userId, 'ai_request')
    if (!canUse) {
      throw new AppError('AI usage limit exceeded. Please upgrade your plan.', 429)
    }
  }

  /**
   * Record AI usage with token count
   */
  async recordUsage(userId: string, tokensUsed: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    const limits = this.subscriptionService.getLimits(user.subscriptionTier)

    // Check if usage exceeds limits
    let usage = await this.prisma.aiUsage.findUnique({
      where: { userId },
    })

    if (!usage) {
      usage = await this.prisma.aiUsage.create({
        data: {
          userId,
          tokensUsed: 0,
          requestCount: 0,
          resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    }

    // Check limit
    if (usage.tokensUsed + tokensUsed > limits.aiTokensPerRequest) {
      throw new AppError('Would exceed AI token limit for this period', 429)
    }

    await this.prisma.aiUsage.update({
      where: { userId },
      data: {
        tokensUsed: { increment: tokensUsed },
        requestCount: { increment: 1 },
      },
    })

    logger.info(`AI usage recorded: ${userId} - ${tokensUsed} tokens`)
  }

  /**
   * Save AI request to history (as AiMessage in an AiConversation)
   */
  async saveRequest(userId: string, data: { request: string; response: string; provider: string; tokensUsed: number }) {
    // Find or create a conversation for this user
    let conversation = await this.prisma.aiConversation.findFirst({
      where: { userId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
    })

    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: {
          userId,
          title: data.request.slice(0, 50),
        },
      })
    }

    // Save user message
    await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: data.request,
        tokensUsed: 0,
      },
    })

    // Save AI response
    const message = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: data.response,
        modelUsed: data.provider as any,
        tokensUsed: data.tokensUsed,
      },
    })

    logger.info(`AI request saved: ${userId}`)
    return message
  }

  /**
   * Get AI request history (from AiConversation/AiMessage)
   */
  async getHistory(userId: string, limit = 20, offset = 0) {
    const [conversations, total] = await Promise.all([
      this.prisma.aiConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.aiConversation.count({ where: { userId } }),
    ])

    return { history: conversations, total }
  }

  /**
   * Clear history (archive all conversations)
   */
  async clearHistory(userId: string) {
    await this.prisma.aiConversation.updateMany({
      where: { userId },
      data: { isArchived: true },
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
        enrollments: { include: { course: { select: { tags: true } } } },
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Get user's preferred tags from enrolled courses
    const tags = user.enrollments.flatMap((e) => e.course.tags).filter(Boolean) as string[]
    const uniqueTags = [...new Set(tags)]

    if (type === 'courses') {
      const recommendations = await this.prisma.course.findMany({
        where: {
          status: 'PUBLISHED',
          NOT: {
            enrollments: { some: { userId } },
          },
          tags: uniqueTags.length > 0 ? { hasSome: uniqueTags } : undefined,
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

  /**
   * Process AI request (mock implementation)
   * In production, this would call OpenAI, Claude, or other AI provider
   */
  async processRequest(userId: string, prompt: string, tokensAllocated: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Mock AI response generation
    // In production, this would call the actual AI API
    const mockResponses: Record<string, string> = {
      course: 'I recommend learning fundamental concepts first before diving into advanced topics.',
      book: 'Consider reading classic texts to build strong foundational knowledge.',
      study: 'Structured learning paths with consistent practice yield the best results.',
      default: 'Thank you for your question. I would need more context to provide a helpful response.',
    }

    // Simple keyword matching for mock response
    let response = mockResponses.default
    for (const [key, value] of Object.entries(mockResponses)) {
      if (prompt.toLowerCase().includes(key)) {
        response = value
        break
      }
    }

    // Save to history
    await this.saveRequest(userId, {
      request: prompt,
      response,
      provider: 'mock',
      tokensUsed: Math.min(tokensAllocated, Math.ceil(prompt.length / 4)),
    })

    logger.info(`AI request processed: ${userId} - Tokens used: ${tokensAllocated}`)

    return {
      response,
      tokensUsed: Math.min(tokensAllocated, Math.ceil(prompt.length / 4)),
      model: 'mock-ai-model',
    }
  }
}
