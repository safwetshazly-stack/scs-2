import { Request, Response, NextFunction } from 'express'
import Stripe from 'stripe'
import { prisma } from '../server'
import { AppError } from '../utils/errors'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

// ─── CREATE CHECKOUT SESSION ─────────────────────────────
export const createCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemType, itemId } = req.body
    const userId = req.user!.id

    let name = '', amount = 0, metadata: any = { userId, itemType, itemId }

    if (itemType === 'course') {
      const course = await prisma.course.findUnique({ where: { id: itemId } })
      if (!course || course.status !== 'PUBLISHED') throw new AppError('Course not available', 404)
      if (course.price === 0) throw new AppError('This course is free', 400)
      const enrolled = await prisma.courseEnrollment.findFirst({ where: { courseId: itemId, userId } })
      if (enrolled) throw new AppError('Already enrolled', 409)
      name = course.title
      amount = course.price
    } else if (itemType === 'book') {
      const book = await prisma.book.findUnique({ where: { id: itemId } })
      if (!book || !book.isPublished) throw new AppError('Book not available', 404)
      if (book.price === 0) throw new AppError('This book is free', 400)
      const purchased = await prisma.bookPurchase.findFirst({ where: { bookId: itemId, userId } })
      if (purchased) throw new AppError('Already purchased', 409)
      name = book.title
      amount = book.price
    } else if (itemType === 'subscription') {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: itemId } })
      if (!plan || !plan.isActive) throw new AppError('Plan not available', 404)
      name = `SCS ${plan.name} Plan`
      amount = plan.price
    } else {
      throw new AppError('Invalid item type', 400)
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
      mode: 'payment',
      success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/payment/cancelled`,
      metadata,
      client_reference_id: userId,
    })

    // Create pending payment record
    await prisma.payment.create({
      data: { userId, amount, currency: 'USD', status: 'PENDING', method: 'STRIPE', stripeId: session.id, metadata },
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (e) { next(e) }
}

// ─── STRIPE WEBHOOK ───────────────────────────────────────
export const stripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['stripe-signature'] as string
    const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const { userId, itemType, itemId } = session.metadata!

      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({ where: { stripeId: session.id }, data: { status: 'COMPLETED' } })

        if (itemType === 'course') {
          const course = await tx.course.findUnique({ where: { id: itemId } })
          if (course) {
            await tx.courseEnrollment.create({ data: { courseId: itemId, userId } })
            await tx.course.update({ where: { id: itemId }, data: { studentsCount: { increment: 1 } } })
          }
        } else if (itemType === 'book') {
          const book = await tx.book.findUnique({ where: { id: itemId } })
          if (book) {
            await tx.bookPurchase.create({ data: { bookId: itemId, userId, pricePaid: book.price } })
            await tx.book.update({ where: { id: itemId }, data: { salesCount: { increment: 1 } } })
          }
        } else if (itemType === 'subscription') {
          const plan = await tx.subscriptionPlan.findUnique({ where: { id: itemId } })
          if (plan) {
            await tx.userSubscription.create({
              data: {
                userId, planId: itemId, status: 'active',
                stripeSubId: session.payment_intent as string,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            })
            await tx.aiUsage.update({
              where: { userId },
              data: { resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            })
          }
        }

        // Notify user
        await tx.notification.create({
          data: {
            userId,
            type: 'PAYMENT',
            title: 'تم الدفع بنجاح!',
            body: `تمت عملية الدفع بنجاح. يمكنك الآن الوصول إلى المحتوى.`,
            data: { itemType, itemId },
          },
        })
      })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent
      await prisma.payment.updateMany({ where: { stripeId: intent.id }, data: { status: 'FAILED' } })
    }

    res.json({ received: true })
  } catch (e) {
    logger.error('Stripe webhook error:', e)
    res.status(400).json({ error: 'Webhook error' })
  }
}

// ─── GET PAYMENT HISTORY ──────────────────────────────────
export const getPaymentHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { transactions: true },
    })
    res.json(payments)
  } catch (e) { next(e) }
}

// ─── GET SUBSCRIPTION ─────────────────────────────────────
export const getSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.userSubscription.findFirst({
      where: { userId: req.user!.id, status: 'active' },
      include: { plan: true },
    })
    res.json(sub)
  } catch (e) { next(e) }
}

// ─── CANCEL SUBSCRIPTION ─────────────────────────────────
export const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.userSubscription.findFirst({ where: { userId: req.user!.id, status: 'active' } })
    if (!sub) throw new AppError('No active subscription', 404)

    if (sub.stripeSubId) {
      await stripe.subscriptions.update(sub.stripeSubId, { cancel_at_period_end: true })
    }
    await prisma.userSubscription.update({ where: { id: sub.id }, data: { cancelAt: sub.currentPeriodEnd } })
    res.json({ message: 'Subscription will cancel at end of billing period' })
  } catch (e) { next(e) }
}

// ─── GET PLANS ────────────────────────────────────────────
export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true } })
    res.json(plans)
  } catch (e) { next(e) }
}
