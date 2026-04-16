/**
 * Book Service
 * Handles book management, purchasing, and reading progress
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { slugify } from '../../../utils/slugify'

export class BookService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all books with pagination
   */
  async getBooks(limit = 20, offset = 0, filters?: { search?: string; genre?: string; authorId?: string }) {
    const where: any = { isPublished: true }

    if (filters?.search) {
      where.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }]
    }

    if (filters?.genre) {
      where.genre = filters.genre
    }

    if (filters?.authorId) {
      where.authorId = filters.authorId
    }

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
          _count: { select: { purchases: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.book.count({ where }),
    ])

    return { books, total }
  }

  /**
   * Get single book
   */
  async getBook(bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: { select: { id: true, username: true, profile: { select: { avatar: true, bio: true } } } },
        _count: { select: { purchases: true, reviews: true } },
        reviews: {
          include: { reviewer: { select: { username: true, profile: { select: { avatar: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!book) {
      throw new AppError('Book not found', 404)
    }

    return book
  }

  /**
   * Create book
   */
  async createBook(authorId: string, data: { title: string; description: string; genre: string; price: number }) {
    const slug = slugify(data.title) + '-' + Date.now()

    const book = await this.prisma.book.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        genre: data.genre,
        price: data.price,
        authorId,
        isPublished: false,
      },
    })

    logger.info(`Book created: ${book.id} by ${authorId}`)
    return book
  }

  /**
   * Update book
   */
  async updateBook(bookId: string, authorId: string, data: Partial<any>) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book || book.authorId !== authorId) {
      throw new AppError('Not authorized', 403)
    }

    const updated = await this.prisma.book.update({
      where: { id: bookId },
      data,
    })

    logger.info(`Book updated: ${bookId}`)
    return updated
  }

  /**
   * Publish book
   */
  async publishBook(bookId: string, authorId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book || book.authorId !== authorId) {
      throw new AppError('Not authorized', 403)
    }

    const updated = await this.prisma.book.update({
      where: { id: bookId },
      data: { isPublished: true, publishedAt: new Date() },
    })

    logger.info(`Book published: ${bookId}`)
    return updated
  }

  /**
   * Purchase book (after payment)
   */
  async purchaseBook(bookId: string, userId: string, pricePaid: number) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book || !book.isPublished) {
      throw new AppError('Book not available', 404)
    }

    const existing = await this.prisma.bookPurchase.findFirst({
      where: { bookId, userId },
    })

    if (existing) {
      throw new AppError('Already purchased', 409)
    }

    const purchase = await this.prisma.bookPurchase.create({
      data: {
        bookId,
        userId,
        pricePaid,
      },
    })

    await this.prisma.book.update({
      where: { id: bookId },
      data: { salesCount: { increment: 1 } },
    })

    logger.info(`Book purchased: ${bookId} by ${userId}`)
    return purchase
  }

  /**
   * Add book review
   */
  async addReview(bookId: string, userId: string, data: { rating: number; comment: string }) {
    const purchase = await this.prisma.bookPurchase.findFirst({
      where: { bookId, userId },
    })

    if (!purchase) {
      throw new AppError('Must purchase to review', 403)
    }

    const review = await this.prisma.bookReview.create({
      data: {
        bookId,
        reviewerId: userId,
        rating: Math.min(5, Math.max(1, data.rating)),
        comment: data.comment,
      },
    })

    logger.info(`Review added: ${bookId} by ${userId}`)
    return review
  }

  /**
   * Get author's books
   */
  async getAuthorBooks(authorId: string, limit = 20, offset = 0) {
    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where: { authorId },
        include: {
          _count: { select: { purchases: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.book.count({ where: { authorId } }),
    ])

    return { books, total }
  }
}
