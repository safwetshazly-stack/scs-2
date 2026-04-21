/**
 * Admin Routes
 */

import { Router } from 'express'
import { body, param } from 'express-validator'
import { PrismaClient } from '@prisma/client'

import { AdminController } from '../controllers/admin.controller'
import { AdminService } from '../services/admin.service'
import { authenticate, requireRole } from '../../../shared/middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'

export function createAdminRoutes(prisma: PrismaClient): Router {
  const router = Router()

  const adminService = new AdminService(prisma)
  const adminController = new AdminController(adminService)

  // All routes require admin role
  router.use(authenticate, requireRole('ADMIN'))

  router.get('/users', (req, res, next) => adminController.getUsers(req, res, next))
  router.post('/users/:targetUserId/ban', body('reason').notEmpty(), validate, (req, res, next) => adminController.banUser(req, res, next))
  router.post('/users/:targetUserId/unban', (req, res, next) => adminController.unbanUser(req, res, next))

  router.get('/analytics', (req, res, next) => adminController.getAnalytics(req, res, next))
  router.get('/stats', (req, res, next) => adminController.getUsageStats(req, res, next))

  router.get('/reports', (req, res, next) => adminController.getReports(req, res, next))
  router.post('/reports/:reportId/resolve', body('resolution').notEmpty(), validate, (req, res, next) => adminController.resolveReport(req, res, next))

  router.get('/logs', (req, res, next) => adminController.getActivityLogs(req, res, next))

  return router
}
