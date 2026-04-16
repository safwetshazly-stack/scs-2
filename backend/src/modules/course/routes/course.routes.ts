/**
 * Course Routes (Refactored)
 */

import { Router } from 'express'
import { body, param } from 'express-validator'
import { PrismaClient } from '@prisma/client'

import { CourseController } from '../controllers/course.controller'
import { CourseService } from '../services/course.service'
import { authenticate, requireRole } from '../../../middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'

export function createCourseRoutes(prisma: PrismaClient): Router {
  const router = Router()

  const courseService = new CourseService(prisma)
  const courseController = new CourseController(courseService)

  router.get('/', (req, res, next) => courseController.getCourses(req, res, next))
  router.get('/:id', (req, res, next) => courseController.getCourse(req, res, next))

  router.post('/', authenticate, requireRole('TEACHER'), (req, res, next) => courseController.createCourse(req, res, next))

  router.put('/:id', authenticate, requireRole('TEACHER'), (req, res, next) => courseController.updateCourse(req, res, next))

  router.post('/:id/publish', authenticate, requireRole('TEACHER'), (req, res, next) => courseController.publishCourse(req, res, next))

  router.post('/:id/enroll', authenticate, (req, res, next) => courseController.enrollCourse(req, res, next))

  router.put('/:courseId/lessons/:lessonId/progress', authenticate, body('progress').isNumeric(), validate, (req, res, next) => courseController.updateProgress(req, res, next))

  router.get('/:id/enrollments', authenticate, requireRole('TEACHER'), (req, res, next) => courseController.getCourseEnrollments(req, res, next))

  router.post('/:id/reviews', authenticate, (req, res, next) => courseController.addReview(req, res, next))

  return router
}
