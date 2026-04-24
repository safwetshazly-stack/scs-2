import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

export class AutoModerationService {
  constructor(private prisma: PrismaClient) {}

  private readonly spamKeywords = ['buy cheap', 'click here', 'free money', 'crypto investment'];
  private readonly abuseKeywords = ['idiot', 'stupid', 'hate', 'kill'];

  /**
   * Detect spam in text content
   */
  detectSpam(content: string): boolean {
    const normalized = content.toLowerCase();
    return this.spamKeywords.some((kw) => normalized.includes(kw));
  }

  /**
   * Detect abusive language
   */
  detectAbuse(content: string): boolean {
    const normalized = content.toLowerCase();
    return this.abuseKeywords.some((kw) => normalized.includes(kw));
  }

  /**
   * Process a post or message for auto-moderation
   */
  async processContent(content: string, userId: string, resourceId: string, resourceType: string): Promise<{ flagged: boolean; reason?: string }> {
    if (this.detectSpam(content)) {
      await this.flagUser(userId, 'Spam detected in content', resourceId, resourceType);
      return { flagged: true, reason: 'spam' };
    }

    if (this.detectAbuse(content)) {
      await this.flagUser(userId, 'Abusive language detected', resourceId, resourceType);
      return { flagged: true, reason: 'abuse' };
    }

    return { flagged: false };
  }

  private async flagUser(userId: string, reason: string, resourceId: string, resourceType: string) {
    try {
      await this.prisma.report.create({
        data: {
          reporterId: 'SYSTEM',
          reportedId: userId,
          reason: 'SPAM',
          description: reason,
          targetId: resourceId,
          targetType: resourceType,
        },
      });
      logger.warn(`Auto-moderation flagged user ${userId} for: ${reason}`);
    } catch (error) {
      logger.error('Failed to auto-flag user', { error });
    }
  }
}
