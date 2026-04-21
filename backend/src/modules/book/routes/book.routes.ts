/**
 * Book Routes
 */

import { Router } from 'express'
import { body, param } from 'express-validator'
import { PrismaClient } from '@prisma/client'

import { BookController } from '../controllers/book.controller'
import { BookService } from '../services/book.service'
import { authenticate, requireRole } from '../../../shared/middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'

export function createBookRoutes(prisma: PrismaClient): Router {
  const router = Router()

  const bookService = new BookService(prisma)
  const bookController = new BookController(bookService)

  router.get('/', (req, res, next) => bookController.getBooks(req, res, next))
  router.get('/:id', (req, res, next) => bookController.getBook(req, res, next))

  router.post('/', authenticate, (req, res, next) => bookController.createBook(req, res, next))
  router.put('/:id', authenticate, (req, res, next) => bookController.updateBook(req, res, next))
  router.post('/:id/publish', authenticate, (req, res, next) => bookController.publishBook(req, res, next))

  router.post('/:id/reviews', authenticate, (req, res, next) => bookController.addReview(req, res, next))

  router.get('/author/:authorId', (req, res, next) => bookController.getAuthorBooks(req, res, next))

  return router
}
