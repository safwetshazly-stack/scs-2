/**
 * Book Controller
 */

import { Request, Response, NextFunction } from 'express'
import { BookService } from '../services/book.service'

export class BookController {
  constructor(private bookService: BookService) {}

  async getBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const filters = {
        search: req.query.search as string,
        tag: req.query.genre as string || req.query.tag as string,
        authorId: req.query.authorId as string,
      }
      const result = await this.bookService.getBooks(limit, offset, filters)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async getBook(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const book = await this.bookService.getBook(id)
      res.json(book)
    } catch (error) {
      next(error)
    }
  }

  async createBook(req: Request, res: Response, next: NextFunction) {
    try {
      const authorId = req.user?.id!
      const { title, description, genre, tags, price, fileUrl } = req.body
      const bookTags = tags || (genre ? [genre] : [])
      const book = await this.bookService.createBook(authorId, { title, description, tags: bookTags, price, fileUrl })
      res.status(201).json(book)
    } catch (error) {
      next(error)
    }
  }

  async updateBook(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const authorId = req.user?.id!
      const data = req.body
      const book = await this.bookService.updateBook(id, authorId, data)
      res.json(book)
    } catch (error) {
      next(error)
    }
  }

  async publishBook(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const authorId = req.user?.id!
      const book = await this.bookService.publishBook(id, authorId)
      res.json(book)
    } catch (error) {
      next(error)
    }
  }

  async addReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.id!
      const { rating, comment } = req.body
      const review = await this.bookService.addReview(id, userId, { rating, comment })
      res.status(201).json(review)
    } catch (error) {
      next(error)
    }
  }

  async getAuthorBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const { authorId } = req.params
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const result = await this.bookService.getAuthorBooks(authorId, limit, offset)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
}
