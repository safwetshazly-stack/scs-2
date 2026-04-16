/**
 * Community Routes
 */

import { Router } from 'express'
import { body, param } from 'express-validator'
import { PrismaClient } from '@prisma/client'

import { CommunityController } from '../controllers/community.controller'
import { CommunityService } from '../services/community.service'
import { authenticate } from '../../../middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'

export function createCommunityRoutes(prisma: PrismaClient): Router {
  const router = Router()

  const communityService = new CommunityService(prisma)
  const communityController = new CommunityController(communityService)

  router.get('/', (req, res, next) => communityController.getCommunities(req, res, next))
  router.post('/', authenticate, (req, res, next) => communityController.createCommunity(req, res, next))

  router.post('/:id/join', authenticate, (req, res, next) => communityController.joinCommunity(req, res, next))
  router.delete('/:id/leave', authenticate, (req, res, next) => communityController.leaveCommunity(req, res, next))

  router.get('/:id/discussions', (req, res, next) => communityController.getDiscussions(req, res, next))
  router.post('/:id/discussions', authenticate, (req, res, next) => communityController.createDiscussion(req, res, next))

  router.post('/:id/discussions/:discussionId/replies', authenticate, (req, res, next) => communityController.replyDiscussion(req, res, next))

  return router
}
