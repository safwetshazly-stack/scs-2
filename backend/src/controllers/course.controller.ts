import { Request, Response, NextFunction } from 'express'
import { prisma, redis } from '../server'
import { AppError } from '../utils/errors'
import slugify from '../utils/slugify'

// ─── GET ALL ─────────────────────────────────────────────
export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search, level, language, minPrice, maxPrice, tag, sort = 'popular', platformId } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = { status: 'PUBLISHED' }
    if (search) where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { tags: { has: search as string } },
    ]
    if (level) where.level = level
    if (language) where.language = language
    if (tag) where.tags = { has: tag }
    if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice as string) }
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice as string) }
    if (platformId) where.platformId = platformId

    const orderBy: any = {
      popular: { studentsCount: 'desc' },
      newest: { createdAt: 'desc' },
      rating: { rating: 'desc' },
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
    }[sort as string] || { studentsCount: 'desc' }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where, skip, take: parseInt(limit as string), orderBy,
        include: {
          instructor: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
          _count: { select: { enrollments: true, reviews: true } },
        },
      }),
      prisma.course.count({ where }),
    ])

    res.set('X-Total-Count', String(total))
    res.json({ courses, total, page: +page, limit: +limit })
  } catch (e) { next(e) }
}

// ─── GET ONE ──────────────────────────────────────────────
export const getCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = `course:${req.params.slug}`
    const cached = await redis.get(cacheKey)
    if (cached) {
      const data = JSON.parse(cached)
      if (req.user) {
        const enrollment = await prisma.courseEnrollment.findFirst({
          where: { courseId: data.id, userId: req.user.id },
          select: { progress: true, completedAt: true },
        })
        data.isEnrolled = !!enrollment
        data.progress = enrollment?.progress || 0
      }
      return res.json(data)
    }

    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug },
      include: {
        instructor: { select: { id: true, username: true, profile: true, _count: { select: { coursesCreated: true, followers: true } } } },
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              select: { id: true, title: true, duration: true, isFree: true, position: true },
            },
          },
        },
        reviews: {
          take: 10, orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } },
        },
        _count: { select: { enrollments: true, reviews: true } },
      },
    })
    if (!course) throw new AppError('Course not found', 404)

    await redis.setEx(cacheKey, 300, JSON.stringify(course))

    let isEnrolled = false
    let progress = 0
    if (req.user) {
      const enrollment = await prisma.courseEnrollment.findFirst({
        where: { courseId: course.id, userId: req.user.id },
        select: { progress: true },
      })
      isEnrolled = !!enrollment
      progress = enrollment?.progress || 0
    }

    res.json({ ...course, isEnrolled, progress })
  } catch (e) { next(e) }
}

// ─── CREATE ───────────────────────────────────────────────
export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, price = 0, level = 'BEGINNER', language = 'AR', tags = [], thumbnail, previewVideo, platformId } = req.body
    const instructorId = req.user!.id

    const baseSlug = slugify(title)
    const existing = await prisma.course.findUnique({ where: { slug: baseSlug } })
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

    // If platformId is provided, optionally verify the creator owns it
    if (platformId && req.user!.role !== 'ADMIN') {
      const platform = await prisma.platform.findUnique({ where: { id: platformId } })
      if (!platform || platform.ownerId !== instructorId) {
        throw new AppError('Unauthorized to publish to this Platform', 403)
      }
    }

    const course = await prisma.course.create({
      data: { title, slug, description, price: +price, level, language, tags, thumbnail, previewVideo, instructorId, platformId, status: 'DRAFT' },
    })
    res.status(201).json(course)
  } catch (e) { next(e) }
}

// ─── UPDATE ───────────────────────────────────────────────
export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const course = await prisma.course.findUnique({ where: { id } })
    if (!course) throw new AppError('Course not found', 404)
    if (course.instructorId !== req.user!.id && req.user!.role !== 'ADMIN') throw new AppError('Forbidden', 403)

    const updated = await prisma.course.update({ where: { id }, data: req.body })
    await redis.del(`course:${course.slug}`)
    res.json(updated)
  } catch (e) { next(e) }
}

// ─── DELETE ───────────────────────────────────────────────
export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const course = await prisma.course.findUnique({ where: { id } })
    if (!course) throw new AppError('Not found', 404)
    if (course.instructorId !== req.user!.id && req.user!.role !== 'ADMIN') throw new AppError('Forbidden', 403)
    if (course.studentsCount > 0) throw new AppError('Cannot delete a course with enrolled students', 400)

    await prisma.course.delete({ where: { id } })
    await redis.del(`course:${course.slug}`)
    res.json({ message: 'Course deleted' })
  } catch (e) { next(e) }
}

// ─── ENROLL ───────────────────────────────────────────────
export const enrollCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const course = await prisma.course.findUnique({ where: { id } })
    if (!course) throw new AppError('Course not found', 404)
    if (course.status !== 'PUBLISHED') throw new AppError('Course not available', 400)

    const existing = await prisma.courseEnrollment.findFirst({ where: { courseId: id, userId } })
    if (existing) throw new AppError('Already enrolled', 409)

    if (course.price > 0) throw new AppError('Payment required', 402)

    const enrollment = await prisma.$transaction(async (tx) => {
      const e = await tx.courseEnrollment.create({ data: { courseId: id, userId } })
      await tx.course.update({ where: { id }, data: { studentsCount: { increment: 1 } } })
      await tx.notification.create({
        data: {
          userId: course.instructorId,
          type: 'COURSE',
          title: 'طالب جديد!',
          body: `انضم طالب جديد إلى كورسك "${course.title}"`,
          data: { courseId: id },
        },
      })
      return e
    })

    await redis.del(`course:${course.slug}`)
    res.status(201).json(enrollment)
  } catch (e) { next(e) }
}

// ─── ADD MODULE ───────────────────────────────────────────
export const addModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const course = await prisma.course.findUnique({ where: { id } })
    if (!course || course.instructorId !== req.user!.id) throw new AppError('Forbidden', 403)

    const last = await prisma.courseModule.findFirst({ where: { courseId: id }, orderBy: { position: 'desc' } })
    const module = await prisma.courseModule.create({
      data: { courseId: id, title: req.body.title, description: req.body.description, position: (last?.position ?? -1) + 1 },
    })
    res.status(201).json(module)
  } catch (e) { next(e) }
}

// ─── ADD LESSON ───────────────────────────────────────────
export const addLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { moduleId } = req.params
    const mod = await prisma.courseModule.findUnique({ where: { id: moduleId }, include: { course: true } })
    if (!mod || mod.course.instructorId !== req.user!.id) throw new AppError('Forbidden', 403)

    const last = await prisma.courseLesson.findFirst({ where: { moduleId }, orderBy: { position: 'desc' } })
    const lesson = await prisma.courseLesson.create({
      data: { moduleId, title: req.body.title, videoUrl: req.body.videoUrl, duration: +req.body.duration || 0, isFree: req.body.isFree || false, position: (last?.position ?? -1) + 1 },
    })
    res.status(201).json(lesson)
  } catch (e) { next(e) }
}

// ─── UPDATE LESSON PROGRESS ───────────────────────────────
export const updateLessonProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lessonId } = req.params
    const userId = req.user!.id
    const { watchedSecs, isCompleted } = req.body

    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: { include: { enrollments: { where: { userId } } } } } } },
    })
    if (!lesson) throw new AppError('Lesson not found', 404)
    if (!lesson.module.course.enrollments.length) throw new AppError('Not enrolled', 403)

    await prisma.lessonProgress.upsert({
      where: { lessonId_userId: { lessonId, userId } },
      create: { lessonId, userId, watchedSecs: +watchedSecs, isCompleted, completedAt: isCompleted ? new Date() : null },
      update: { watchedSecs: +watchedSecs, isCompleted, completedAt: isCompleted ? new Date() : undefined },
    })

    // Recalculate course progress
    const courseId = lesson.module.course.id
    const [total, completed] = await Promise.all([
      prisma.courseLesson.count({ where: { module: { courseId } } }),
      prisma.lessonProgress.count({ where: { userId, isCompleted: true, lesson: { module: { courseId } } } }),
    ])
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0
    await prisma.courseEnrollment.updateMany({ where: { courseId, userId }, data: { progress, completedAt: progress === 100 ? new Date() : null } })

    res.json({ progress })
  } catch (e) { next(e) }
}

// ─── ADD REVIEW ───────────────────────────────────────────
export const addReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { rating, content } = req.body

    const enrollment = await prisma.courseEnrollment.findFirst({ where: { courseId: id, userId } })
    if (!enrollment) throw new AppError('You must be enrolled to review', 403)

    const review = await prisma.courseReview.upsert({
      where: { courseId_userId: { courseId: id, userId } },
      create: { courseId: id, userId, rating: +rating, content },
      update: { rating: +rating, content },
      include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } },
    })

    // Update course avg rating
    const avg = await prisma.courseReview.aggregate({ where: { courseId: id }, _avg: { rating: true }, _count: true })
    await prisma.course.update({ where: { id }, data: { rating: avg._avg.rating || 0, reviewsCount: avg._count } })

    res.json(review)
  } catch (e) { next(e) }
}

// ─── GET INSTRUCTOR COURSES ───────────────────────────────
export const getInstructorCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true, reviews: true } } },
    })
    res.json(courses)
  } catch (e) { next(e) }
}

// ─── PUBLISH / UNPUBLISH ──────────────────────────────────
export const publishCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const course = await prisma.course.findUnique({ where: { id } })
    if (!course || course.instructorId !== req.user!.id) throw new AppError('Forbidden', 403)

    const updated = await prisma.course.update({ where: { id }, data: { status: 'PENDING_REVIEW' } })
    await redis.del(`course:${course.slug}`)
    res.json(updated)
  } catch (e) { next(e) }
}
