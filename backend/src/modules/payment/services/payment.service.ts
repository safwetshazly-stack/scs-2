/**
 * Payment Service
 * Handles Stripe integration, payments, subscriptions, and revenue splitting
 */

import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { env } from '../../../config/env'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create Stripe checkout session
   */
  async createCheckout(userId: string, itemType: string, itemId: string) {
    let name = ''
    let amount = 0
    const metadata: any = { userId, itemType, itemId }

    if (itemType === 'course') {
      const course = await this.prisma.course.findUnique({ where: { id: itemId } })
      if (!course || course.status !== 'PUBLISHED') {
        throw new AppError('Course not available', 404)
      }
      if (course.price === 0) {
        throw new AppError('This course is free', 400)
      }

      const enrolled = await this.prisma.courseEnrollment.findFirst({
        where: { courseId: itemId, userId },
      })
      if (enrolled) {
        throw new AppError('Already enrolled', 409)
      }

      name = course.title
      amount = course.price
    } else if (itemType === 'book') {
      const book = await this.prisma.book.findUnique({ where: { id: itemId } })
      if (!book || !book.isPublished) {
        throw new AppError('Book not available', 404)
      }
      if (book.price === 0) {
        throw new AppError('This book is free', 400)
      }

      const purchased = await this.prisma.bookPurchase.findFirst({
        where: { bookId: itemId, userId },
      })
      if (purchased) {
        throw new AppError('Already purchased', 409)
      }

      name = book.title
      amount = book.price
    } else if (itemType === 'subscription') {
      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: itemId } })
      if (!plan || !plan.isActive) {
        throw new AppError('Plan not available', 404)
      }

      name = `SCS ${plan.name} Plan`
      amount = plan.price
    } else {
      throw new AppError('Invalid item type', 400)
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/payment/cancelled`,
      metadata,
      client_reference_id: userId,
    })

    // Create pending payment record
    await this.prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'USD',
        status: 'PENDING',
        method: 'STRIPE',
        stripeId: session.id,
        metadata,
      },
    })

    logger.info(`Checkout created: ${userId} - ${itemType}/${itemId}`)

    return {
      url: session.url,
      sessionId: session.id,
    }
  }

  /**
   * Handle Stripe webhook - checkout.session.completed
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { userId, itemType, itemId } = session.metadata!

    // Idempotency check: prevent duplicate processing
    const existingPayment = await this.prisma.payment.findFirst({
      where: { stripeId: session.id, status: 'COMPLETED' },
    })

    if (existingPayment) {
      logger.warn(`Webhook already processed: ${session.id}`)
      return
    }

    await this.prisma.$transaction(async (tx) => {
      // Mark payment as completed
      await tx.payment.updateMany({
        where: { stripeId: session.id },
        data: { status: 'COMPLETED' },
      })

      const amountPaid = (session.amount_total || 0) / 100

      if (itemType === 'course') {
        const course = await tx.course.findUnique({ where: { id: itemId } })
        if (course) {
          // Enroll student
          await tx.courseEnrollment.create({
            data: { courseId: itemId, userId },
          })

          await tx.course.update({
            where: { id: itemId },
            data: { studentsCount: { increment: 1 } },
          })

          // Revenue split: 20% app, 15% platform (if exists), remainder to creator
          let platformCut = 0
          if (course.platformId) {
            const platform = await tx.platform.findUnique({ where: { id: course.platformId } })
            if (platform) {
              platformCut = amountPaid * (platform.commissionRate / 100)
              await tx.user.update({
                where: { id: platform.ownerId },
                data: { walletBalance: { increment: platformCut } },
              })
            }
          }

          const appCut = amountPaid * 0.2
          const creatorCut = amountPaid - appCut - platformCut

          await tx.user.update({
            where: { id: course.instructorId },
            data: { walletBalance: { increment: creatorCut } },
          })
        }
      } else if (itemType === 'book') {
        const book = await tx.book.findUnique({ where: { id: itemId } })
        if (book) {
          // Record purchase
          await tx.bookPurchase.create({
            data: {
              bookId: itemId,
              userId,
              pricePaid: book.price,
            },
          })

          await tx.book.update({
            where: { id: itemId },
            data: { salesCount: { increment: 1 } },
          })

          // Revenue split: 30% app, 70% author
          const appCut = amountPaid * 0.3
          const authorCut = amountPaid - appCut

          await tx.user.update({
            where: { id: book.authorId },
            data: { walletBalance: { increment: authorCut } },
          })
        }
      } else if (itemType === 'subscription') {
        const plan = await tx.subscriptionPlan.findUnique({ where: { id: itemId } })
        if (plan) {
          // Create Stripe subscription for recurring billing
          const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } })

          const customer = await stripe.customers.create({
            email: user?.email,
          })

          const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
              {
                price_data: {
                  currency: 'usd',
                  product: `SCS ${plan.name} Plan`,
                  unit_amount: Math.round(plan.price * 100),
                  recurring: {
                    interval: (plan.interval as 'month' | 'year') || 'month',
                  },
                },
              },
            ],
          })

          // Create user subscription record
          await tx.userSubscription.create({
            data: {
              userId,
              planId: itemId,
              stripeSubscriptionId: subscription.id,
              status: 'ACTIVE',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          })

          // Update subscription tier
          await tx.user.update({
            where: { id: userId },
            data: { subscriptionTier: plan.tier as any },
          })

          logger.info(`Subscription created: ${userId} - ${plan.name}`)
        }
      }
    })

    logger.info(`Payment completed: ${userId} - ${itemType}/${itemId}`)
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string, limit = 20, offset = 0) {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.payment.count({ where: { userId } }),
    ])

    return { payments, total }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    })

    if (!subscription) {
      throw new AppError('No active subscription found', 404)
    }

    // Cancel Stripe subscription
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
    }

    // Mark as cancelled
    await this.prisma.userSubscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })

    // Downgrade user tier
    await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: 'FREE' },
    })

    logger.info(`Subscription cancelled: ${userId}`)
  }
}
