/**
 * Payment Controller (Refactored)
 * Thin HTTP request/response handler
 * All business logic in PaymentService
 */

import { Request, Response, NextFunction } from 'express'
import Stripe from 'stripe'
import { PaymentService } from '../services/payment.service'
import { env } from '../../../config/env'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /**
   * POST /payments/checkout
   */
  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const { itemType, itemId } = req.body

      const result = await this.paymentService.createCheckout(userId, itemType, itemId)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /payments/stripe-webhook
   */
  async stripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers['stripe-signature'] as string
      const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET)

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        await this.paymentService.handleCheckoutCompleted(session)
      }

      res.json({ received: true })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /payments/history
   */
  async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0

      const result = await this.paymentService.getPaymentHistory(userId, limit, offset)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /payments/subscription/cancel
   */
  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!

      await this.paymentService.cancelSubscription(userId)

      res.json({ message: 'Subscription cancelled' })
    } catch (error) {
      next(error)
    }
  }
}
