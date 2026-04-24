import { Worker, Job } from 'bullmq'
import { redis } from '../shared/database/redis'
import { prisma } from '../shared/database/prisma'
import { logger } from '../utils/logger'

export const startVideoWorker = () => {
  const worker = new Worker('videoProcessing', async (job: Job) => {
    const { videoId, rawUrl } = job.data
    logger.info(`Started processing video job ${job.id} for video ${videoId}`)

    try {
      // 1. Ensure DB status is set to PROCESSING
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'PROCESSING' }
      })

      // In a real production environment, AWS EC2 GPU instances or Hetzner bare-metal servers
      // would download the file from the raw bucket, execute a robust FFmpeg configuration mapping
      // to generate an HLS master playlist with multiple variant streams (1080p, 720p, 480p).
      // They would then upload these .ts and .m3u8 segments to the public bucket using R2.
      
      logger.info(`Transcoding video ${videoId} from ${rawUrl} (FFmpeg simulation active...)`)
      await new Promise((res) => setTimeout(res, 8000)) 

      const hlsDummyUrl = `https://cdn.scs-platform.com/hls/${videoId}/master.m3u8`
      
      // 2. Finalize Video Status in Primary DB
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'READY', hlsUrl: hlsDummyUrl, quality: '1080p,720p,480p', duration: 420 }
      })

      logger.info(`Video ${videoId} HLS transcoding complete successfully`)
    } catch (error) {
      logger.error(`Failed to process video ${videoId}:`, error)
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'FAILED' }
      })
      throw error
    }
  }, {
    connection: redis as any,
    concurrency: 5 // Multi-threading transcoding limit per worker node
  })

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`)
  })
  
  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} successfully completed.`)
  })
}
