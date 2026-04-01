import { Router } from 'express'
import { handleCloudflareWebhook } from '../controllers/webhook.controller'

export const webhookRoutes = Router()

// Do not attach `authenticate` here as it is an external secure invocation
webhookRoutes.post('/cloud-storage', handleCloudflareWebhook)
