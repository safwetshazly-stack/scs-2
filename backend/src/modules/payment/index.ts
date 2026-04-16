/**
 * Payment Module
 * 
 * Public API for payments and billing
 * 
 * Responsibilities:
 * - Stripe integration
 * - Subscription management
 * - Payment webhook handling
 * - Revenue splitting
 * - User wallet management
 * 
 * Dependencies:
 * - Auth Module (for authentication)
 * - User Module (for wallet updates)
 * 
 * Events emitted:
 * - payment:checkout-created
 * - payment:completed
 * - payment:failed
 * - subscription:created
 * - subscription:cancelled
 *
 * Listens to:
 * - (none initially, but emits events that other modules listen to)
 */

export { PaymentService } from './services/payment.service'
export { PaymentController } from './controllers/payment.controller'
export { createPaymentRoutes } from './routes/payment.routes'
export type { PaymentIntent, Subscription } from './types'
