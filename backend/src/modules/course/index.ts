/**
 * Course Module
 *
 * Public API for courses and learning management
 *
 * Responsibilities:
 * - Course management (CRUD)
 * - Lessons and modules
 * - Student enrollment
 * - Progress tracking
 * - Course reviews
 * - Library management
 * - Download tokens
 *
 * Dependencies:
 * - Auth Module (for authentication)
 * - Payment Module (listens for course purchase events)
 *
 * Events emitted:
 * - course:enrolled
 * - course:completed
 * - course:progress-update
 *
 * Listens to:
 * - payment:course-purchased (from Payment module)
 */

export { CourseService } from './services/course.service'
export { LibraryService } from './services/library.service'
export { DownloadService } from './services/download.service'
export { CourseController } from './controllers/course.controller'
export { createCourseRoutes } from './routes/course.routes'
