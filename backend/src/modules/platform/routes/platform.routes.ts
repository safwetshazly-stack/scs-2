/**
 * Platform Routes
 */

import { Router } from 'express'
import { body, param } from 'express-validator'
import { PrismaClient } from '@prisma/client'

import { PlatformController } from '../controllers/platform.controller'
import { PlatformService } from '../services/platform.service'
import { authenticate } from '../../../middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'

export function createPlatformRoutes(prisma: PrismaClient): Router {
  const router = Router()

  const platformService = new PlatformService(prisma)
  const platformController = new PlatformController(platformService)

  router.get('/', (req, res, next) => platformController.getPlatforms(req, res, next))
  router.post('/', authenticate, (req, res, next) => platformController.createPlatform(req, res, next))

  router.get('/:id', (req, res, next) => platformController.getPlatform(req, res, next))
  router.put('/:id', authenticate, (req, res, next) => platformController.updatePlatform(req, res, next))

  router.post('/:id/join', authenticate, (req, res, next) => platformController.requestJoin(req, res, next))
  router.post('/:id/join-requests/:requestId/approve', authenticate, (req, res, next) => platformController.approveJoinRequest(req, res, next))

  router.get('/:id/revenue', authenticate, (req, res, next) => platformController.getRevenue(req, res, next))

  return router
}
