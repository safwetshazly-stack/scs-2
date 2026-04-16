import { Request, Response, NextFunction } from 'express'
import { NotificationService } from '../services/notification.service'
import { AppError } from '../../../utils/errors'

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', unread } = req.query
      const result = await this.notificationService.getNotifications(
        req.user!.id,
        parseInt(page as string),
        parseInt(limit as string),
        unread === 'true'
      )
      res.set('X-Total-Count', result.total.toString())
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await this.notificationService.markAsRead(req.params.id, req.user!.id)
      res.json({ message: 'Marked as read' })
    } catch (error) {
      next(error)
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await this.notificationService.markAllAsRead(req.user!.id)
      res.json({ message: 'All marked as read' })
    } catch (error) {
      next(error)
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      await this.notificationService.deleteNotification(req.params.id, req.user!.id)
      res.json({ message: 'Deleted' })
    } catch (error) {
      next(error)
    }
  }

  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await this.notificationService.getNotificationSettings(req.user!.id)
      res.json(settings)
    } catch (error) {
      next(error)
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await this.notificationService.updateNotificationSettings(
        req.user!.id,
        req.body
      )
      res.json(settings)
    } catch (error) {
      next(error)
    }
  }
}
