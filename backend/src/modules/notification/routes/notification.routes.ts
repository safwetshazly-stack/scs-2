import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { NotificationService } from '../services/notification.service'
import { NotificationController } from '../controllers/notification.controller'
import { authenticate } from '../../../shared/middlewares/auth.middleware'

export function createNotificationRoutes(prisma: PrismaClient): Router {
  const router = Router()
  const notificationService = new NotificationService(prisma)
  const notificationController = new NotificationController(notificationService)

  router.use(authenticate)

  router.get(
    '/',
    (req, res, next) => notificationController.getNotifications(req, res, next)
  )

  router.patch(
    '/:id/read',
    (req, res, next) => notificationController.markAsRead(req, res, next)
  )

  router.patch(
    '/read-all',
    (req, res, next) => notificationController.markAllAsRead(req, res, next)
  )

  router.delete(
    '/:id',
    (req, res, next) => notificationController.deleteNotification(req, res, next)
  )

  router.get(
    '/settings',
    (req, res, next) => notificationController.getSettings(req, res, next)
  )

  router.patch(
    '/settings',
    (req, res, next) => notificationController.updateSettings(req, res, next)
  )

  return router
}
