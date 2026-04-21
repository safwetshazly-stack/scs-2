import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { WebhookService } from '../services/webhook.service'
import { WebhookController } from '../controllers/webhook.controller'

export function createWebhookRoutes(prisma: PrismaClient): Router {
  const router = Router()
  const webhookService = new WebhookService(prisma)
  const webhookController = new WebhookController(webhookService)

  router.post('/cloud-storage', (req, res, next) => webhookController.handleCloudflareWebhook(req, res, next))

  return router
}
