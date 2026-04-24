import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export class LibraryService {
  constructor(private prisma: PrismaClient) {}

  async getOrCreateLibrary(userId: string) {
    let library = await this.prisma.userLibrary.findUnique({
      where: { userId },
    })

    if (!library) {
      library = await this.prisma.userLibrary.create({
        data: { userId },
      })
    }

    return library
  }

  async addCourseToLibrary(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course) {
      throw new AppError('Course not found', 404)
    }

    const enrolled = await this.prisma.courseEnrollment.findFirst({
      where: { userId, courseId },
    })
    if (!enrolled) {
      throw new AppError('Not enrolled in this course', 403)
    }

    const library = await this.getOrCreateLibrary(userId)

    const existing = await this.prisma.libraryCourse.findFirst({
      where: { libraryId: library.id, courseId },
    })
    if (existing) {
      throw new AppError('Already in library', 409)
    }

    await this.prisma.libraryCourse.create({
      data: {
        libraryId: library.id,
        courseId,
      },
    })

    logger.info(`Course added to library: ${userId} - ${courseId}`)
  }

  async addBookToLibrary(userId: string, bookId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book) {
      throw new AppError('Book not found', 404)
    }

    const purchased = await this.prisma.bookPurchase.findFirst({
      where: { userId, bookId },
    })
    if (!purchased) {
      throw new AppError('Book not purchased', 403)
    }

    const library = await this.getOrCreateLibrary(userId)

    const existing = await this.prisma.libraryBook.findFirst({
      where: { libraryId: library.id, bookId },
    })
    if (existing) {
      throw new AppError('Already in library', 409)
    }

    await this.prisma.libraryBook.create({
      data: {
        libraryId: library.id,
        bookId,
      },
    })

    logger.info(`Book added to library: ${userId} - ${bookId}`)
  }

  async markOffline(resourceId: string, resourceType: 'COURSE' | 'BOOK') {
    if (resourceType === 'COURSE') {
      const libraryCourse = await this.prisma.libraryCourse.findUnique({
        where: { id: resourceId },
      })
      if (!libraryCourse) {
        throw new AppError('Library course not found', 404)
      }

      await this.prisma.libraryCourse.update({
        where: { id: resourceId },
        data: { isOffline: true },
      })
    } else if (resourceType === 'BOOK') {
      const libraryBook = await this.prisma.libraryBook.findUnique({
        where: { id: resourceId },
      })
      if (!libraryBook) {
        throw new AppError('Library book not found', 404)
      }

      await this.prisma.libraryBook.update({
        where: { id: resourceId },
        data: { isOffline: true },
      })
    }

    logger.info(`Marked offline: ${resourceId}`)
  }

  async trackProgress(userId: string, courseId: string, progress: number) {
    const library = await this.getOrCreateLibrary(userId)

    const libraryCourse = await this.prisma.libraryCourse.findFirst({
      where: { libraryId: library.id, courseId },
    })
    if (!libraryCourse) {
      throw new AppError('Course not in library', 404)
    }

    await this.prisma.libraryCourse.update({
      where: { id: libraryCourse.id },
      data: {
        progress,
        lastOpenedAt: new Date(),
      },
    })

    logger.info(`Progress tracked: ${userId} - ${courseId} - ${progress}%`)
  }

  async getLibrary(userId: string) {
    const library = await this.getOrCreateLibrary(userId)

    const [courses, books] = await Promise.all([
      this.prisma.libraryCourse.findMany({
        where: { libraryId: library.id },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              level: true,
            },
          },
        },
      }),
      this.prisma.libraryBook.findMany({
        where: { libraryId: library.id },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
            },
          },
        },
      }),
    ])

    return {
      library,
      courses,
      books,
    }
  }

  async removeFromLibrary(libraryItemId: string, itemType: 'COURSE' | 'BOOK') {
    if (itemType === 'COURSE') {
      await this.prisma.libraryCourse.delete({ where: { id: libraryItemId } })
    } else if (itemType === 'BOOK') {
      await this.prisma.libraryBook.delete({ where: { id: libraryItemId } })
    }

    logger.info(`Removed from library: ${libraryItemId}`)
  }

  /**
   * Check if user has a course in library (enrolled)
   */
  async hasCourse(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { userId, courseId },
    })
    return !!enrollment
  }

  /**
   * Check if user has a book in library (purchased)
   */
  async hasBook(userId: string, bookId: string): Promise<boolean> {
    const purchase = await this.prisma.bookPurchase.findFirst({
      where: { userId, bookId },
    })
    return !!purchase
  }
}
