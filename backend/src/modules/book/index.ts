/**
 * Book Module
 *
 * Public API for e-book management
 *
 * Responsibilities:
 * - Book management (CRUD)
 * - Book purchases
 * - Book reviews
 * - User library
 *
 * Dependencies:
 * - Auth Module (for authentication)
 * - Payment Module (listens for book purchase events)
 *
 * Events emitted:
 * - book:purchased
 *
 * Listens to:
 * - payment:book-purchased (from Payment module)
 */

export { BookService } from './services/book.service'
export { BookController } from './controllers/book.controller'
export { createBookRoutes } from './routes/book.routes'
