import { Router } from 'express'
import { body, param } from 'express-validator'
import { validate } from '../middlewares/validate.middleware'
import { authenticate, optionalAuth, requireInstructor } from '../middlewares/auth.middleware'
import {
  getCourses, getCourse, createCourse, updateCourse, deleteCourse,
  enrollCourse, addModule, addLesson, updateLessonProgress,
  addReview, getInstructorCourses, publishCourse,
} from '../controllers/course.controller'

export const courseRoutes = Router()

courseRoutes.get('/', optionalAuth, getCourses)
courseRoutes.get('/instructor/mine', authenticate, requireInstructor, getInstructorCourses)
courseRoutes.get('/:slug', optionalAuth, getCourse)
courseRoutes.post('/', authenticate, requireInstructor, [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 chars'),
  body('description').trim().isLength({ min: 20 }).withMessage('Description too short'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Invalid price'),
], validate, createCourse)
courseRoutes.patch('/:id', authenticate, requireInstructor, updateCourse)
courseRoutes.delete('/:id', authenticate, requireInstructor, deleteCourse)
courseRoutes.post('/:id/enroll', authenticate, enrollCourse)
courseRoutes.post('/:id/publish', authenticate, requireInstructor, publishCourse)
courseRoutes.post('/:id/modules', authenticate, requireInstructor, [
  body('title').trim().notEmpty(),
], validate, addModule)
courseRoutes.post('/modules/:moduleId/lessons', authenticate, requireInstructor, [
  body('title').trim().notEmpty(),
  body('duration').optional().isInt({ min: 0 }),
], validate, addLesson)
courseRoutes.post('/lessons/:lessonId/progress', authenticate, [
  body('watchedSecs').isInt({ min: 0 }),
  body('isCompleted').isBoolean(),
], validate, updateLessonProgress)
courseRoutes.post('/:id/reviews', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('content').optional().isLength({ max: 1000 }),
], validate, addReview)
