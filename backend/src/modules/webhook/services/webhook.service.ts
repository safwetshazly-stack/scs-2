import { PrismaClient } from '@prisma/client'
import { addVideoProcessingJob } from '../../../queues/video.queue'
import { logger } from '../../../utils/logger'

export class WebhookService {
  constructor(private prisma: PrismaClient) {}

  async handleCloudflareWebhook(payload: any): Promise<{ received: boolean }> {
    const { key, bucket, eventName } = payload

    if (eventName === 'ObjectCreated:Put' && key.startsWith('raw-videos/')) {
      logger.info(`Received webhook for new raw video: ${key}`)

      const video = await this.prisma.video.create({
        data: {
          lessonId: 'dummy-awaiting-course-link',
          rawUrl: `s3://${bucket}/${key}`,
          status: 'PROCESSING',
        },
      })

      if (video.rawUrl) {
        await addVideoProcessingJob(video.id, video.rawUrl)
      }
    }

    return { received: true }
  }
}
