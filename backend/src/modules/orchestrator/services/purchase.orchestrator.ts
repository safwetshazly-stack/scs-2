/**
 * Purchase Orchestrator
 * Coordinates purchase flow: validation → payment → library addition → commission tracking
 * Supports Course and Book purchases with transaction safety
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { PaymentService } from '../../payment/services/payment.service'
import { LibraryService } from '../../course/services/library.service'

export class PurchaseOrchestrator {
  constructor(
    private prisma: PrismaClient,
    private paymentService: PaymentService,
    private libraryService: LibraryService
  ) {}

  /**
   * Purchase Course Flow
   * 1. Validate user
   * 2. Validate course exists and is published
   * 3. Check if already enrolled
   * 4. Create transaction with 13% commission
   * 5. Add to user library
   * 6. Create enrollment
   */
  async purchaseCourse(userId: string, courseId: string) {
    // 1. Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // 2. Validate course exists and is published
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course) {
      throw new AppError('Course not found', 404)
    }

    if (course.status !== 'PUBLISHED') {
      throw new AppError('Course not available for purchase', 400)
    }

    if (course.price <= 0) {
      throw new AppError('This course is free. Use enrollment instead.', 400)
    }

    // 3. Check if already enrolled
    const existingEnrollment = await this.prisma.courseEnrollment.findFirst({
      where: { userId, courseId },
    })
    if (existingEnrollment) {
      throw new AppError('Already enrolled in this course', 409)
    }

    // 4. Create transaction with atomic operations
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Create payment record
        const payment = await tx.payment.create({
          data: {
            userId,
            amount: course.price,
            status: 'COMPLETED',
            stripeId: `MOCK_${Date.now()}`,
            method: 'CARD',
          },
        })

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            paymentId: payment.id,
            type: 'COURSE_PURCHASE',
            referenceId: courseId,
            description: `Course purchase: ${course.title}`,
            amount: course.price,
          },
        })

        // Calculate and record commission (13% for courses)
        const commissionAmount = course.price * 0.13
        await tx.commission.create({
          data: {
            transactionId: transaction.id,
            rate: 0.13,
            amount: commissionAmount,
            description: `Commission for course purchase (13%)`,
          },
        })

        // Create course enrollment
        const enrollment = await tx.courseEnrollment.create({
          data: {
            userId,
            courseId,
            progress: 0,
          },
        })

        // Add to user library
        const library = await tx.userLibrary.findUnique({ where: { userId } })
        let libraryId = library?.id
        if (!libraryId) {
          const newLibrary = await tx.userLibrary.create({
            data: { userId },
          })
          libraryId = newLibrary.id
        }

        await tx.libraryCourse.create({
          data: {
            libraryId,
            courseId,
          },
        })

        logger.info(`Course purchased: ${userId} - ${courseId} - $${course.price}`)

        return {
          success: true,
          payment,
          transaction,
          enrollment,
          commission: { rate: 0.13, amount: commissionAmount },
        }
      },
      { timeout: 30000 }
    )

    return result
  }

  /**
   * Purchase Book Flow
   * 1. Validate user
   * 2. Validate book exists and is published
   * 3. Check if already purchased
   * 4. Create transaction with 20% commission
   * 5. Add to user library
   * 6. Create book purchase record
   */
  async purchaseBook(userId: string, bookId: string) {
    // 1. Validate user
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // 2. Validate book exists and is published
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book) {
      throw new AppError('Book not found', 404)
    }

    if (!book.isPublished) {
      throw new AppError('Book not available for purchase', 400)
    }

    if (book.price <= 0) {
      throw new AppError('This book is free. Cannot purchase.', 400)
    }

    // 3. Check if already purchased
    const existingPurchase = await this.prisma.bookPurchase.findFirst({
      where: { userId, bookId },
    })
    if (existingPurchase) {
      throw new AppError('Already purchased this book', 409)
    }

    // 4. Create transaction with atomic operations
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Create payment record
        const payment = await tx.payment.create({
          data: {
            userId,
            amount: book.price,
            status: 'COMPLETED',
            stripeId: `MOCK_${Date.now()}`,
            method: 'CARD',
          },
        })

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            paymentId: payment.id,
            type: 'BOOK_PURCHASE',
            referenceId: bookId,
            description: `Book purchase: ${book.title}`,
            amount: book.price,
          },
        })

        // Calculate and record commission (20% for books)
        const commissionAmount = book.price * 0.2
        await tx.commission.create({
          data: {
            transactionId: transaction.id,
            rate: 0.2,
            amount: commissionAmount,
            description: `Commission for book purchase (20%)`,
          },
        })

        // Create book purchase record
        const bookPurchase = await tx.bookPurchase.create({
          data: {
            userId,
            bookId,
            pricePaid: book.price,
          },
        })

        // Add to user library
        const library = await tx.userLibrary.findUnique({ where: { userId } })
        let libraryId = library?.id
        if (!libraryId) {
          const newLibrary = await tx.userLibrary.create({
            data: { userId },
          })
          libraryId = newLibrary.id
        }

        await tx.libraryBook.create({
          data: {
            libraryId,
            bookId,
          },
        })

        logger.info(`Book purchased: ${userId} - ${bookId} - $${book.price}`)

        return {
          success: true,
          payment,
          transaction,
          bookPurchase,
          commission: { rate: 0.2, amount: commissionAmount },
        }
      },
      { timeout: 30000 }
    )

    return result
  }

  /**
   * Get purchase eligibility for course
   * Returns whether user can purchase a course
   */
  async getCoursePurchaseEligibility(
    userId: string,
    courseId: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    // Check user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { eligible: false, reason: 'User not found' }
    }

    // Check course exists
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return { eligible: false, reason: 'Course not found' }
    }

    if (course.status !== 'PUBLISHED') {
      return { eligible: false, reason: 'Course not published' }
    }

    if (course.price <= 0) {
      return { eligible: false, reason: 'Course is free' }
    }

    // Check if already enrolled
    const enrolled = await this.prisma.courseEnrollment.findFirst({
      where: { userId, courseId },
    })
    if (enrolled) {
      return { eligible: false, reason: 'Already enrolled' }
    }

    return { eligible: true }
  }

  /**
   * Get purchase eligibility for book
   * Returns whether user can purchase a book
   */
  async getBookPurchaseEligibility(
    userId: string,
    bookId: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    // Check user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { eligible: false, reason: 'User not found' }
    }

    // Check book exists
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book) {
      return { eligible: false, reason: 'Book not found' }
    }

    if (!book.isPublished) {
      return { eligible: false, reason: 'Book not published' }
    }

    if (book.price <= 0) {
      return { eligible: false, reason: 'Book is free' }
    }

    // Check if already purchased
    const purchased = await this.prisma.bookPurchase.findFirst({
      where: { userId, bookId },
    })
    if (purchased) {
      return { eligible: false, reason: 'Already purchased' }
    }

    return { eligible: true }
  }
}
