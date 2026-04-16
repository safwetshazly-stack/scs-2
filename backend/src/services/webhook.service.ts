import { PrismaClient } from '@prisma/client'
import { addVideoProcessingJob } from '../queues/video.queue'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export class WebhookService {
  constructor(private prisma: PrismaClient) {}

  async handleCloudflareWebhook(payload: any): Promise<{ received: boolean }> {
    const { key, bucket, eventName } = payload

    // Process only 'ObjectCreated:Put' for raw-videos/ prefix
    if (eventName === 'ObjectCreated:Put' && key.startsWith('raw-videos/')) {
      logger.info(`Received webhook for new raw video: ${key}`)

      // Create a DB video record tracking this newly uploaded video
      const video = await this.prisma.video.create({
        data: {
          lessonId: 'dummy-awaiting-course-link',
          rawUrl: `s3://${bucket}/${key}`,
          status: 'PROCESSING'
        }
      })

      // Dispatch Video to the FFmpeg Transcoding Worker Cluster (BullMQ)
      if (video.rawUrl) {
        await addVideoProcessingJob(video.id, video.rawUrl)
      }
    }

    return { received: true }
  }
}
