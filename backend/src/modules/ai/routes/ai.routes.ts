/**
 * AI Routes
 */

import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { RedisClient } from '../../../shared/database/redis'

import { AiController } from '../controllers/ai.controller'
import { AiService } from '../services/ai.service'
import { SubscriptionService } from '../../subscription/services/subscription.service'
import { authenticate } from '../../../shared/middlewares/auth.middleware'

export function createAiRoutes(prisma: PrismaClient, redis: RedisClient): Router {
  const router = Router()

  const subscriptionService = new SubscriptionService(prisma)
  const aiService = new AiService(prisma, redis, subscriptionService)
  const aiController = new AiController(aiService)

  router.get('/usage', authenticate, (req, res, next) => aiController.checkUsage(req, res, next))
  router.get('/history', authenticate, (req, res, next) => aiController.getHistory(req, res, next))
  router.delete('/history', authenticate, (req, res, next) => aiController.clearHistory(req, res, next))
  router.get('/recommendations/:type', authenticate, (req, res, next) => aiController.getRecommendations(req, res, next))

  return router
}
