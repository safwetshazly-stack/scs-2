import { Router } from 'express'
import { body } from 'express-validator'
import { validate } from '../middlewares/validate.middleware'
import { authenticate, optionalAuth } from '../middlewares/auth.middleware'
import { getBooks, getBook, createBook, updateBook, purchaseBook, getMyLibrary, addBookReview } from '../controllers/book.controller'

export const bookRoutes = Router()

bookRoutes.get('/', optionalAuth, getBooks)
bookRoutes.get('/library', authenticate, getMyLibrary)
bookRoutes.get('/:slug', optionalAuth, getBook)
bookRoutes.post('/', authenticate, [
  body('title').trim().isLength({ min: 3, max: 100 }),
  body('description').trim().isLength({ min: 10 }),
  body('fileUrl').notEmpty().withMessage('File URL is required'),
  body('price').optional().isFloat({ min: 0 }),
], validate, createBook)
bookRoutes.patch('/:id', authenticate, updateBook)
bookRoutes.post('/:id/purchase', authenticate, purchaseBook)
bookRoutes.post('/:id/reviews', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('content').optional().isLength({ max: 1000 }),
], validate, addBookReview)
