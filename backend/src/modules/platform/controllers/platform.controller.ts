/**
 * Platform Controller
 */

import { Request, Response, NextFunction } from 'express'
import { PlatformService } from '../services/platform.service'

export class PlatformController {
  constructor(private platformService: PlatformService) {}

  async createPlatform(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user?.id!
      const { name, description, commissionRate } = req.body
      const platform = await this.platformService.createPlatform(ownerId, { name, description, commissionRate })
      res.status(201).json(platform)
    } catch (error) {
      next(error)
    }
  }

  async getPlatforms(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const result = await this.platformService.getPlatforms(limit, offset)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async getPlatform(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const platform = await this.platformService.getPlatform(id)
      res.json(platform)
    } catch (error) {
      next(error)
    }
  }

  async updatePlatform(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const ownerId = req.user?.id!
      const data = req.body
      const platform = await this.platformService.updatePlatform(id, ownerId, data)
      res.json(platform)
    } catch (error) {
      next(error)
    }
  }

  async requestJoin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.id!
      const request = await this.platformService.requestJoin(id, userId)
      res.status(201).json(request)
    } catch (error) {
      next(error)
    }
  }

  async approveJoinRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { requestId } = req.params
      const ownerId = req.user?.id!
      await this.platformService.approveJoinRequest(requestId, ownerId)
      res.json({ message: 'Request approved' })
    } catch (error) {
      next(error)
    }
  }

  async getRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const ownerId = req.user?.id!
      const analytics = await this.platformService.getRevenue(id, ownerId)
      res.json(analytics)
    } catch (error) {
      next(error)
    }
  }
}
