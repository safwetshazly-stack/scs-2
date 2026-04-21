/**
 * Payment Routes (Refactored)
 */

import { Router } from 'express'
import { body } from 'express-validator'
import { PrismaClient } from '@prisma/client'

import { PaymentController } from '../controllers/payment.controller'
import { PaymentService } from '../services/payment.service'
import { authenticate } from '../../../shared/middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'
import { env } from '../../../config/env'

export function createPaymentRoutes(prisma: PrismaClient): Router {
  const router = Router()

  const paymentService = new PaymentService(prisma)
  const paymentController = new PaymentController(paymentService)

  router.post('/checkout', authenticate, body('itemType').notEmpty(), body('itemId').notEmpty(), validate, (req, res, next) => paymentController.createCheckout(req, res, next))

  // Stripe webhook (raw body, no validation)
  router.post('/stripe-webhook', (req, res, next) => paymentController.stripeWebhook(req, res, next))

  router.get('/history', authenticate, (req, res, next) => paymentController.getPaymentHistory(req, res, next))

  router.post('/subscription/cancel', authenticate, (req, res, next) => paymentController.cancelSubscription(req, res, next))

  return router
}
