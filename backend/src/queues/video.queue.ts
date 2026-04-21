import { Queue } from 'bullmq'
import { redis } from '../shared/database/redis'

export const videoQueue = new Queue('videoProcessing', {
  connection: redis as any,
})

export const addVideoProcessingJob = async (videoId: string, rawUrl: string) => {
  await videoQueue.add('processVideo', { videoId, rawUrl }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
