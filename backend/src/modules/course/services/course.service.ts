/**
 * Course Service
 * Handles course management, enrollment, and progress tracking
 */

import { PrismaClient, CourseLevel } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import slugify from '../../../utils/slugify'

export class CourseService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all courses with pagination
   */
  async getCourses(
    limit = 20,
    offset = 0,
    filters?: { search?: string; tag?: string; level?: string; instructorId?: string }
  ) {
    const where: any = { status: 'PUBLISHED' }

    if (filters?.search) {
      where.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }]
    }

    if (filters?.tag) {
      where.tags = { has: filters.tag }
    }

    if (filters?.level) {
      where.level = filters.level
    }

    if (filters?.instructorId) {
      where.instructorId = filters.instructorId
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          instructor: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
          _count: { select: { enrollments: true, modules: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.course.count({ where }),
    ])

    return { courses, total }
  }

  /**
   * Get single course
   */
  async getCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: { select: { id: true, username: true, profile: { select: { avatar: true, bio: true } } } },
        modules: {
          include: {
            lessons: { select: { id: true, title: true, position: true, videoUrl: true, duration: true } },
          },
        },
        _count: { select: { enrollments: true, reviews: true } },
        reviews: {
          include: { user: { select: { username: true, profile: { select: { avatar: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!course) {
      throw new AppError('Course not found', 404)
    }

    return course
  }

  /**
   * Create course
   */
  async createCourse(instructorId: string, data: { title: string; description: string; tags: string[]; level: string; price: number }) {
    const slug = slugify(data.title) + '-' + Date.now()

    const course = await this.prisma.course.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        tags: data.tags || [],
        level: data.level as CourseLevel,
        price: data.price,
        instructorId,
        status: 'DRAFT',
      },
    })

    logger.info(`Course created: ${course.id} by ${instructorId}`)
    return course
  }

  /**
   * Update course
   */
  async updateCourse(courseId: string, instructorId: string, data: Partial<any>) {
    // Verify ownership
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course || course.instructorId !== instructorId) {
      throw new AppError('Not authorized', 403)
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data,
    })

    logger.info(`Course updated: ${courseId}`)
    return updated
  }

  /**
   * Publish course
   */
  async publishCourse(courseId: string, instructorId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course || course.instructorId !== instructorId) {
      throw new AppError('Not authorized', 403)
    }

    // Check if course has content
    const moduleCount = await this.prisma.courseModule.count({ where: { courseId } })
    if (moduleCount === 0) {
      throw new AppError('Course must have at least one module', 400)
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'PUBLISHED' },
    })

    logger.info(`Course published: ${courseId}`)
    return updated
  }

  /**
   * Enroll in course
   */
  async enrollCourse(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course || course.status !== 'PUBLISHED') {
      throw new AppError('Course not available', 404)
    }

    const existing = await this.prisma.courseEnrollment.findFirst({
      where: { courseId, userId },
    })

    if (existing) {
      throw new AppError('Already enrolled', 409)
    }

    const enrollment = await this.prisma.courseEnrollment.create({
      data: { courseId, userId },
    })

    await this.prisma.course.update({
      where: { id: courseId },
      data: { studentsCount: { increment: 1 } },
    })

    logger.info(`User ${userId} enrolled in course ${courseId}`)
    return enrollment
  }

  /**
   * Update lesson progress
   */
  async updateProgress(courseId: string, lessonId: string, userId: string, progress: number) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { courseId, userId },
    })

    if (!enrollment) {
      throw new AppError('Not enrolled in this course', 403)
    }

    const lessonProgress = await this.prisma.lessonProgress.upsert({
      where: {
        lessonId_userId: { lessonId, userId },
      },
      create: {
        userId,
        lessonId,
        isCompleted: progress >= 90,
        watchedSecs: progress,
        completedAt: progress >= 90 ? new Date() : null,
      },
      update: {
        isCompleted: progress >= 90,
        watchedSecs: progress,
        completedAt: progress >= 90 ? new Date() : null,
      },
    })

    logger.info(`Progress updated: ${userId} - ${lessonId}`)
    return lessonProgress
  }

  /**
   * Get course enrollments (for instructor)
   */
  async getCourseEnrollments(courseId: string, instructorId: string, limit = 20, offset = 0) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course || course.instructorId !== instructorId) {
      throw new AppError('Not authorized', 403)
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: { courseId },
        include: {
          user: { select: { id: true, username: true, email: true, profile: { select: { avatar: true } } } },
        },
        orderBy: { enrolledAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.courseEnrollment.count({ where: { courseId } }),
    ])

    return { enrollments, total }
  }

  /**
   * Add course review
   */
  async addReview(courseId: string, userId: string, data: { rating: number; comment: string }) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { courseId, userId },
    })

    if (!enrollment) {
      throw new AppError('Must be enrolled to review', 403)
    }

    const review = await this.prisma.courseReview.create({
      data: {
        courseId,
        userId,
        rating: Math.min(5, Math.max(1, data.rating)),
        content: data.comment,
      },
    })

    logger.info(`Review added: ${courseId} by ${userId}`)
    return review
  }
}
