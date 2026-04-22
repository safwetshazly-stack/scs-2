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
      where: { 
        OR: [
          { rawUrl: { contains: data.uid } },
          { hlsUrl: { contains: data.uid } }
        ]
      },
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
        status: status as any,
      },
    })

    logger.info(`Video status updated: ${videoId} - ${status} - Progress: ${progress}`)
  }

  /**
   * Log webhook delivery
   */
  async logWebhookDelivery(eventType: string, source: string, payload: any, status: number, response?: any) {
    logger.info(`[WEBHOOK] ${source} - ${eventType} - Status: ${status}`);
    // WebhookLog schema model is not defined, we fallback to our logger.
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(limit = 50, offset = 0, source?: string) {
    // Return empty array since WebhookLog model does not exist
    return []
  }
}
