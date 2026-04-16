/**
 * Course Controller (Refactored)
 * Thin HTTP request/response handler
 * All business logic in CourseService
 */

import { Request, Response, NextFunction } from 'express'
import { CourseService } from '../services/course.service'

export class CourseController {
  constructor(private courseService: CourseService) {}

  /**
   * GET /courses
   */
  async getCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const filters = {
        search: req.query.search as string,
        category: req.query.category as string,
        level: req.query.level as string,
        instructorId: req.query.instructorId as string,
      }

      const result = await this.courseService.getCourses(limit, offset, filters)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /courses/:id
   */
  async getCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const course = await this.courseService.getCourse(id)

      res.json(course)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /courses
   */
  async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const instructorId = req.user?.id!
      const data = req.body

      const course = await this.courseService.createCourse(instructorId, data)

      res.status(201).json(course)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PUT /courses/:id
   */
  async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const instructorId = req.user?.id!
      const data = req.body

      const course = await this.courseService.updateCourse(id, instructorId, data)

      res.json(course)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /courses/:id/publish
   */
  async publishCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const instructorId = req.user?.id!

      const course = await this.courseService.publishCourse(id, instructorId)

      res.json(course)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /courses/:id/enroll
   */
  async enrollCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.id!

      const enrollment = await this.courseService.enrollCourse(id, userId)

      res.status(201).json(enrollment)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PUT /courses/:courseId/lessons/:lessonId/progress
   */
  async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, lessonId } = req.params
      const { progress } = req.body
      const userId = req.user?.id!

      const lessonProgress = await this.courseService.updateProgress(courseId, lessonId, userId, progress)

      res.json(lessonProgress)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /courses/:id/enrollments
   */
  async getCourseEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const instructorId = req.user?.id!
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0

      const result = await this.courseService.getCourseEnrollments(id, instructorId, limit, offset)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /courses/:id/reviews
   */
  async addReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.id!
      const { rating, comment } = req.body

      const review = await this.courseService.addReview(id, userId, { rating, comment })

      res.status(201).json(review)
    } catch (error) {
      next(error)
    }
  }
}
