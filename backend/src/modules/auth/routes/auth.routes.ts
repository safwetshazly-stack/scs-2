/**
 * Auth Routes (Refactored)
 */

import { Router } from 'express'
import { body, param } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { RedisClient } from '../../../shared/database/redis'

import { AuthController } from '../controllers/auth.controller'
import { AuthService } from '../services/auth.service'
import { validate } from '../../../middlewares/validate.middleware'
import { authenticate } from '../../../shared/middlewares/auth.middleware'

export function createAuthRoutes(prisma: PrismaClient, redis: RedisClient): Router {
  const router = Router()

  // Dependency injection
  const authService = new AuthService(prisma, redis)
  const authController = new AuthController(authService)

  // Validators
  const registerValidators = [
    body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8, max: 128 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('role').optional().isIn(['USER', 'TEACHER']),
  ]

  const loginValidators = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]

  const resetPasswordValidators = [
    body('token').notEmpty(),
    body('password').isLength({ min: 8, max: 128 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ]

  // Routes
  router.post('/register', registerValidators, validate, (req, res, next) => authController.register(req, res, next))
  router.post('/login', loginValidators, validate, (req, res, next) => authController.login(req, res, next))
  router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next))
  router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next))
  router.get('/verify-email/:token', param('token').notEmpty(), validate, (req, res, next) => authController.verifyEmail(req, res, next))
  router.post('/forgot-password', body('email').isEmail(), validate, (req, res, next) => authController.forgotPassword(req, res, next))
  router.post('/reset-password', resetPasswordValidators, validate, (req, res, next) => authController.resetPassword(req, res, next))
  router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next))

  return router
}
