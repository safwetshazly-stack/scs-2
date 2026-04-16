/**
 * User Routes (Refactored)
 */

import { Router } from 'express'
import { param } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { RedisClientType } from 'redis'

import { UserController } from '../controllers/user.controller'
import { UserService } from '../services/user.service'
import { authenticate } from '../../../middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'

export function createUserRoutes(prisma: PrismaClient, redis: RedisClientType): Router {
  const router = Router()

  const userService = new UserService(prisma, redis)
  const userController = new UserController(userService)

  router.get('/:username', param('username').notEmpty(), validate, (req, res, next) => userController.getProfile(req, res, next))
  router.put('/profile', authenticate, (req, res, next) => userController.updateProfile(req, res, next))
  router.put('/settings', authenticate, (req, res, next) => userController.updateSettings(req, res, next))
  router.post('/:id/follow', authenticate, (req, res, next) => userController.follow(req, res, next))
  router.delete('/:id/follow', authenticate, (req, res, next) => userController.unfollow(req, res, next))
  router.get('/:username/followers', (req, res, next) => userController.getFollowers(req, res, next))
  router.get('/:username/following', (req, res, next) => userController.getFollowing(req, res, next))
  router.post('/:id/block', authenticate, (req, res, next) => userController.blockUser(req, res, next))
  router.delete('/:id/block', authenticate, (req, res, next) => userController.unblockUser(req, res, next))
  router.delete('/account', authenticate, (req, res, next) => userController.deleteAccount(req, res, next))

  return router
}
