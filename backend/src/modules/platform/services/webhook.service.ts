/**
 * Webhook Service
 * Handles webhook processing from external services (Stripe, Cloudflare, etc.)
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export class WebhookService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Handle Cloudflare video webhook
   */
  async handleCloudflareWebhook(data: any) {
    if (!data.uid) {
      throw new AppError('Invalid webhook data', 400)
    }

    const video = await this.prisma.video.findFirst({
      where: { cloudflareId: data.uid },
    })

    if (!video) {
      logger.warn(`Video not found for Cloudflare ID: ${data.uid}`)
      return
    }

    // Update video status based on webhook
    if (data.status === 'ready') {
      await this.prisma.video.update({
        where: { id: video.id },
        data: {
          status: 'READY',
          rawUrl: data.downloadUrl || null,
        },
      })

      logger.info(`Video ready: ${video.id}`)
    } else if (data.status === 'failed') {
      await this.prisma.video.update({
        where: { id: video.id },
        data: {
          status: 'FAILED',
          errorMessage: data.error?.message || 'Unknown error',
        },
      })

      logger.error(`Video processing failed: ${video.id}`)
    }
  }

  /**
   * Handle video processing status update
   */
  async updateVideoProcessingStatus(videoId: string, status: string, progress?: number) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    })

    if (!video) {
      throw new AppError('Video not found', 404)
    }

    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status,
        processingProgress: progress || null,
      },
    })

    logger.info(`Video status updated: ${videoId} - ${status}`)
  }

  /**
   * Log webhook delivery
   */
  async logWebhookDelivery(eventType: string, source: string, payload: any, status: number, response?: any) {
    await this.prisma.webhookLog.create({
      data: {
        eventType,
        source,
        payload,
        status,
        response: response || null,
      },
    })
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(limit = 50, offset = 0, source?: string) {
    const where: any = {}
    if (source) {
      where.source = source
    }

    return await this.prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }
}
