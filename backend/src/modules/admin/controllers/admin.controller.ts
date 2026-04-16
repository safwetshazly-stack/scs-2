/**
 * Admin Controller
 */

import { Request, Response, NextFunction } from 'express'
import { AdminService } from '../services/admin.service'

export class AdminController {
  constructor(private adminService: AdminService) {}

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.adminService.requireAdmin(userId)
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const filters = {
        search: req.query.search as string,
        role: req.query.role as string,
        banned: req.query.banned === 'true',
      }
      const result = await this.adminService.getUsers(limit, offset, filters)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async banUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.adminService.requireAdmin(userId)
      const { targetUserId } = req.params
      const { reason } = req.body
      await this.adminService.banUser(targetUserId, reason)
      res.json({ message: 'User banned' })
    } catch (error) {
      next(error)
    }
  }

  async unbanUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.adminService.requireAdmin(userId)
      const { targetUserId } = req.params
      await this.adminService.unbanUser(targetUserId)
      res.json({ message: 'User unbanned' })
    } catch (error) {
      next(error)
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.adminService.requireAdmin(userId)
      const analytics = await this.adminService.getPlatformAnalytics()
      res.json(analytics)
    } catch (error) {
      next(error)
    }
  }

  async getUsageStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.adminService.requireAdmin(userId)
      const days = parseInt(req.query.days as string) || 30
      const stats = await this.adminService.getUsageStats(days)
      res.json(stats)
    } catch (error) {
      next(error)
    }
  }

  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.adminService.requireAdmin(userId)
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const status = req.query.status as string
      const result = await this.adminService.getReports(limit, offset, status)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async resolveReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.adminService.requireAdmin(userId)
      const { reportId } = req.params
      const { resolution } = req.body
      await this.adminService.resolveReport(reportId, resolution)
      res.json({ message: 'Report resolved' })
    } catch (error) {
      next(error)
    }
  }

  async getActivityLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.adminService.requireAdmin(userId)
      const limit = parseInt(req.query.limit as string) || 50
      const offset = parseInt(req.query.offset as string) || 0
      const logs = await this.adminService.getActivityLogs(limit, offset)
      res.json(logs)
    } catch (error) {
      next(error)
    }
  }
}
