import { Request, Response, NextFunction } from 'express'
import { prisma, redis } from '../server'
import { AppError } from '../utils/errors'
import slugify from '../utils/slugify'

export const getBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search, language, minPrice, maxPrice, sort = 'popular' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const where: any = { isPublished: true }
    if (search) where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ]
    if (language) where.language = language
    if (minPrice) where.price = { ...where.price, gte: +minPrice }
    if (maxPrice) where.price = { ...where.price, lte: +maxPrice }

    const orderBy: any = { popular: { salesCount: 'desc' }, newest: { createdAt: 'desc' }, rating: { rating: 'desc' } }[sort as string] || { salesCount: 'desc' }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where, skip, take: +limit, orderBy,
        include: { author: { select: { id: true, username: true, profile: { select: { avatar: true } } } } },
      }),
      prisma.book.count({ where }),
    ])
    res.set('X-Total-Count', String(total))
    res.json({ books, total })
  } catch (e) { next(e) }
}

export const getBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await prisma.book.findUnique({
      where: { slug: req.params.slug },
      include: {
        author: { select: { id: true, username: true, profile: true } },
        reviews: { take: 10, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } } },
        _count: { select: { purchases: true } },
      },
    })
    if (!book) throw new AppError('Book not found', 404)

    let isPurchased = false
    if (req.user) {
      const purchase = await prisma.bookPurchase.findFirst({ where: { bookId: book.id, userId: req.user.id } })
      isPurchased = !!purchase
    }

    const result = { ...book, fileUrl: isPurchased ? book.fileUrl : null, isPurchased }
    res.json(result)
  } catch (e) { next(e) }
}

export const createBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, price = 0, language = 'AR', tags = [], coverImage, fileUrl, pages } = req.body
    const baseSlug = slugify(title)
    const existing = await prisma.book.findUnique({ where: { slug: baseSlug } })
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

    const book = await prisma.book.create({
      data: { title, slug, description, price: +price, language, tags, coverImage, fileUrl, pages: pages ? +pages : null, authorId: req.user!.id },
    })
    res.status(201).json(book)
  } catch (e) { next(e) }
}

export const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const book = await prisma.book.findUnique({ where: { id } })
    if (!book || book.authorId !== req.user!.id) throw new AppError('Forbidden', 403)
    const updated = await prisma.book.update({ where: { id }, data: req.body })
    res.json(updated)
  } catch (e) { next(e) }
}

export const purchaseBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const book = await prisma.book.findUnique({ where: { id } })
    if (!book || !book.isPublished) throw new AppError('Book not available', 404)

    const existing = await prisma.bookPurchase.findFirst({ where: { bookId: id, userId } })
    if (existing) throw new AppError('Already purchased', 409)

    if (book.price > 0) throw new AppError('Payment required', 402)

    await prisma.$transaction([
      prisma.bookPurchase.create({ data: { bookId: id, userId, pricePaid: book.price } }),
      prisma.book.update({ where: { id }, data: { salesCount: { increment: 1 } } }),
    ])
    res.status(201).json({ message: 'Book added to your library', fileUrl: book.fileUrl })
  } catch (e) { next(e) }
}

export const getMyLibrary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchases = await prisma.bookPurchase.findMany({
      where: { userId: req.user!.id },
      orderBy: { purchasedAt: 'desc' },
      include: { book: { include: { author: { select: { username: true } } } } },
    })
    res.json(purchases.map(p => ({ ...p.book, purchasedAt: p.purchasedAt })))
  } catch (e) { next(e) }
}

export const addBookReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const purchase = await prisma.bookPurchase.findFirst({ where: { bookId: id, userId } })
    if (!purchase) throw new AppError('You must purchase the book to review it', 403)

    const review = await prisma.bookReview.upsert({
      where: { bookId_userId: { bookId: id, userId } },
      create: { bookId: id, userId, rating: +req.body.rating, content: req.body.content },
      update: { rating: +req.body.rating, content: req.body.content },
    })
    const avg = await prisma.bookReview.aggregate({ where: { bookId: id }, _avg: { rating: true }, _count: true })
    await prisma.book.update({ where: { id }, data: { rating: avg._avg.rating || 0, reviewsCount: avg._count } })
    res.json(review)
  } catch (e) { next(e) }
}
