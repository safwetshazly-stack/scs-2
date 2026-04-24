/**
 * Community Routes
 */

import { Router } from 'express'
import { body, param } from 'express-validator'
import { PrismaClient } from '@prisma/client'

import { CommunityController } from '../controllers/community.controller'
import { CommunityService } from '../services/community.service'
import { authenticate } from '../../../shared/middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'

export function createCommunityRoutes(prisma: PrismaClient): Router {
  const router = Router()

  const communityService = new CommunityService(prisma)
  const communityController = new CommunityController(communityService)

  router.get('/', (req, res, next) => communityController.getCommunities(req, res, next))
  router.post('/', authenticate, (req, res, next) => communityController.createCommunity(req, res, next))

  router.post('/:id/join', authenticate, (req, res, next) => communityController.joinCommunity(req, res, next))
  router.delete('/:id/leave', authenticate, (req, res, next) => communityController.leaveCommunity(req, res, next))

  router.get('/:id', (req, res, next) => communityController.getCommunity(req, res, next))
  router.put('/:id', authenticate, (req, res, next) => communityController.updateCommunity(req, res, next))

  router.get('/:id/posts', (req, res, next) => communityController.getPosts(req, res, next))
  router.post('/:id/posts', authenticate, (req, res, next) => communityController.createPost(req, res, next))

  router.post('/:postId/comments', authenticate, (req, res, next) => communityController.commentOnPost(req, res, next))
  router.post('/:postId/like', authenticate, (req, res, next) => communityController.likePost(req, res, next))
  router.delete('/:postId/unlike', authenticate, (req, res, next) => communityController.unlikePost(req, res, next))
  router.delete('/:postId', authenticate, (req, res, next) => communityController.deletePost(req, res, next))

  return router
}
