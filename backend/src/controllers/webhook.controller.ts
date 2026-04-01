import { Request, Response } from 'express'
import { prisma } from '../server'
import { logger } from '../utils/logger'
import { addVideoProcessingJob } from '../queues/video.queue'
import { env } from '../config/env'

export const handleCloudflareWebhook = async (req: Request, res: Response) => {
  try {
    // 1. Verify Webhook Authenticity (Cloudflare R2 Header Validation)
    const signature = req.headers['x-scs-webhook-auth']
    if (!signature || signature !== env.WEBHOOK_SECRET) {
      logger.warn('Unauthorized webhook payload attempt detected')
      return res.status(401).json({ error: 'Unauthorized payload signature' })
    }

    // Example Cloudflare R2 Event structure for ObjectCreated
    const { key, bucket, eventName } = req.body
    
    // Process only 'ObjectCreated:Put' for raw-videos/ prefix
    if (eventName === 'ObjectCreated:Put' && key.startsWith('raw-videos/')) {
      logger.info(`Received webhook for new raw video: ${key}`)

      // Create a DB video record tracking this newly uploaded video
      const video = await prisma.video.create({
        data: {
          lessonId: 'dummy-awaiting-course-link', // In an actual flow, encoded in metadata
          rawUrl: `s3://${bucket}/${key}`,
          status: 'PROCESSING'
        }
      })
      
      // Dispatch Video to the FFmpeg Transcoding Worker Cluster (BullMQ)
      await addVideoProcessingJob(video.id, video.rawUrl)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    logger.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
