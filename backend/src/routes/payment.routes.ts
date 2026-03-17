import { Router, raw } from 'express'
import { body } from 'express-validator'
import { validate } from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'
import { createCheckout, stripeWebhook, getPaymentHistory, getSubscription, cancelSubscription, getPlans } from '../controllers/payment.controller'

export const paymentRoutes = Router()

// Stripe webhook must use raw body
paymentRoutes.post('/webhook', raw({ type: 'application/json' }), stripeWebhook)

paymentRoutes.use(authenticate)
paymentRoutes.get('/plans', getPlans)
paymentRoutes.post('/checkout', [
  body('itemType').isIn(['course', 'book', 'subscription']),
  body('itemId').notEmpty(),
], validate, createCheckout)
paymentRoutes.get('/history', getPaymentHistory)
paymentRoutes.get('/subscription', getSubscription)
paymentRoutes.delete('/subscription', cancelSubscription)
