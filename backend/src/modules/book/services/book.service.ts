/**
 * Book Service
 * Handles book management, purchasing, and reading progress
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import slugify from '../../../utils/slugify'

export class BookService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all books with pagination
   */
  async getBooks(limit = 20, offset = 0, filters?: { search?: string; tag?: string; authorId?: string }) {
    const where: any = { isPublished: true }

    if (filters?.search) {
      where.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }]
    }

    if (filters?.tag) {
      where.tags = { has: filters.tag }
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
          include: { user: { select: { username: true, profile: { select: { avatar: true } } } } },
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
  async createBook(authorId: string, data: { title: string; description: string; tags?: string[]; price: number; fileUrl: string }) {
    const slug = slugify(data.title) + '-' + Date.now()

    const book = await this.prisma.book.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        tags: data.tags || [],
        fileUrl: data.fileUrl,
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
      data: { isPublished: true },
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
        userId,
        rating: Math.min(5, Math.max(1, data.rating)),
        content: data.comment,
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

  /**
   * Create new version of book
   */
  async createVersion(bookId: string, authorId: string, newFileUrl: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book || book.authorId !== authorId) {
      throw new AppError('Not authorized', 403)
    }

    // Store version info in tags
    const versionTag = `version:${Date.now()}`
    const oldTags = book.tags || []
    const newTags = [...oldTags, versionTag]

    const updated = await this.prisma.book.update({
      where: { id: bookId },
      data: {
        fileUrl: newFileUrl,
        tags: newTags,
      },
    })

    logger.info(`New version created: ${bookId} - ${versionTag}`)
    return updated
  }

  /**
   * Add part to book
   */
  async addPart(bookId: string, authorId: string, partName: string, startPage: number, endPage: number) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book || book.authorId !== authorId) {
      throw new AppError('Not authorized', 403)
    }

    const partTag = `part:${partName}:${startPage}-${endPage}`
    const oldTags = book.tags || []
    const newTags = [...oldTags, partTag]

    await this.prisma.book.update({
      where: { id: bookId },
      data: { tags: newTags },
    })

    logger.info(`Part added: ${bookId} - ${partName} (${startPage}-${endPage})`)

    return {
      name: partName,
      startPage,
      endPage,
    }
  }

  /**
   * Enable preview access for book
   */
  async enablePreview(bookId: string, authorId: string, previewPages: number = 10) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book || book.authorId !== authorId) {
      throw new AppError('Not authorized', 403)
    }

    const oldTags = book.tags || []
    const newTags = oldTags.filter((tag) => !tag.startsWith('preview:'))
    newTags.push(`preview:${previewPages}`)

    await this.prisma.book.update({
      where: { id: bookId },
      data: { tags: newTags },
    })

    logger.info(`Preview enabled: ${bookId} - ${previewPages} pages`)

    return { bookId, previewPages }
  }

  /**
   * Get preview access info
   */
  getPreviewInfo(book: any): { hasPreview: boolean; previewPages: number } {
    const previewTag = book.tags?.find((tag: string) => tag.startsWith('preview:'))
    if (!previewTag) {
      return { hasPreview: false, previewPages: 0 }
    }

    const pages = parseInt(previewTag.replace('preview:', ''))
    return { hasPreview: true, previewPages: pages }
  }

  /**
   * Check if user can access full book
   */
  async checkFullAccess(bookId: string, userId: string): Promise<boolean> {
    const purchase = await this.prisma.bookPurchase.findFirst({
      where: { bookId, userId },
    })

    return !!purchase
  }

  /**
   * Get book parts
   */
  getParts(book: any): Array<{ name: string; startPage: number; endPage: number }> {
    const parts: Array<{ name: string; startPage: number; endPage: number }> = []

    const partTags = book.tags?.filter((tag: string) => tag.startsWith('part:')) || []

    for (const tag of partTags) {
      const [_, name, pages] = tag.split(':')
      const [startPage, endPage] = pages.split('-').map(Number)
      parts.push({ name, startPage, endPage })
    }

    return parts
  }

  /**
   * Get book versions
   */
  getVersions(book: any): Array<{ versionId: string; createdAt: string }> {
    const versions: Array<{ versionId: string; createdAt: string }> = []

    const versionTags = book.tags?.filter((tag: string) => tag.startsWith('version:')) || []

    for (const tag of versionTags) {
      const versionId = tag.replace('version:', '')
      versions.push({
        versionId,
        createdAt: new Date(parseInt(versionId)).toISOString(),
      })
    }

    return versions.reverse()
  }
}
