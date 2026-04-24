import { PrismaClient, SubscriptionTier } from '@prisma/client';
import { logger } from '../../../utils/logger';

export class AIOptimizationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Determine the optimal model and token limit for a user based on tier
   */
  async optimizeRequest(userId: string, requestedModel: string): Promise<{ allowed: boolean; model: string; maxTokens: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) {
      return { allowed: false, model: 'gpt-3.5-turbo', maxTokens: 0 };
    }

    // Reduce unnecessary usage for free users
    if (user.subscriptionTier === 'FREE') {
      return {
        allowed: true,
        model: 'gpt-3.5-turbo', // Downgrade to cheaper model
        maxTokens: 500, // Hard limit for free
      };
    }

    // Prioritize premium users
    if (user.subscriptionTier === 'GOLD') {
      return {
        allowed: true,
        model: requestedModel === 'AUTO' ? 'gpt-4' : requestedModel,
        maxTokens: 4000,
      };
    }

    // Silver tier
    return {
      allowed: true,
      model: requestedModel === 'gpt-4' ? 'gpt-3.5-turbo' : requestedModel, // Save costs
      maxTokens: 1500,
    };
  }
}
