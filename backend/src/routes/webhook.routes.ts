import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { WebhookService } from '../services/webhook.service'
import { env } from '../config/env'

export function createWebhookRoutes(prisma: PrismaClient): Router {
  const router = Router()
  const webhookService = new WebhookService(prisma)

  // Do not attach `authenticate` here as it is an external secure invocation
  router.post('/cloud-storage', async (req, res) => {
    try {
      // 1. Verify Webhook Authenticity (Cloudflare R2 Header Validation)
      const signature = req.headers['x-scs-webhook-auth']
      if (!signature || signature !== env.WEBHOOK_SECRET) {
        logger.warn('Unauthorized webhook payload attempt detected')
        return res.status(401).json({ error: 'Unauthorized payload signature' })
      }

      const result = await webhookService.handleCloudflareWebhook(req.body)
      res.status(200).json(result)
    } catch (error) {
      logger.error('Webhook error:', error)
      res.status(500).json({ error: 'Internal Server Error' })
    }
  })

  return router
}

