import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

export class SmartFraudService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Run pattern analysis for a user
   */
  async analyzeUserPatterns(userId: string): Promise<{ isFraudulent: boolean; riskScore: number }> {
    let riskScore = 0;

    // Pattern 1: Rapid purchases (e.g., 5+ purchases in 1 hour)
    const recentPurchases = await this.prisma.payment.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentPurchases >= 5) riskScore += 30;

    // Pattern 2: Multiple IP addresses in short time
    const recentLogins = await this.prisma.loginAttempt.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { ipAddress: true },
    });

    const uniqueIps = new Set(recentLogins.map(l => l.ipAddress));
    if (uniqueIps.size > 3) riskScore += 40;

    // Pattern 3: Excessive token generation (downloads)
    const recentDownloads = await this.prisma.downloadLog.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentDownloads > 20) riskScore += 30;

    const isFraudulent = riskScore >= 70;

    if (isFraudulent) {
      await this.autoFlagUser(userId, riskScore);
    }

    return { isFraudulent, riskScore };
  }

  /**
   * Auto flag user for admin review
   */
  private async autoFlagUser(userId: string, score: number): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          userId,
          alertType: 'FRAUD_DETECTED',
          severity: 'HIGH',
          description: `Smart fraud analysis detected highly suspicious patterns. Score: ${score}`,
          riskScore: score,
          metadata: {},
        },
      });
      logger.warn(`Smart Fraud Service flagged user ${userId} with score ${score}`);
    } catch (error) {
      logger.error('Failed to auto-flag user for fraud', { error });
    }
  }
}
