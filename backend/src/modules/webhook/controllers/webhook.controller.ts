import { Request, Response, NextFunction } from 'express'
import { WebhookService } from '../services/webhook.service'
import { logger } from '../../../utils/logger'
import { env } from '../../../config/env'

export class WebhookController {
  constructor(private webhookService: WebhookService) {}

  async handleCloudflareWebhook(req: Request, res: Response, _next: NextFunction) {
    try {
      const signature = req.headers['x-scs-webhook-auth']
      if (!signature || signature !== env.WEBHOOK_SECRET) {
        logger.warn('Unauthorized webhook payload attempt detected')
        return res.status(401).json({ error: 'Unauthorized payload signature' })
      }

      const result = await this.webhookService.handleCloudflareWebhook(req.body)
      res.status(200).json(result)
    } catch (error) {
      logger.error('Webhook error:', error)
      res.status(500).json({ error: 'Internal Server Error' })
    }
  }
}
