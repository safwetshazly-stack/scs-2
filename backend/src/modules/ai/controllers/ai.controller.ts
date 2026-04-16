/**
 * AI Controller
 */

import { Request, Response, NextFunction } from 'express'
import { AiService } from '../services/ai.service'

export class AiController {
  constructor(private aiService: AiService) {}

  async checkUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const usage = await this.aiService.checkUsageLimit(userId)
      res.json(usage)
    } catch (error) {
      next(error)
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const result = await this.aiService.getHistory(userId, limit, offset)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async clearHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      await this.aiService.clearHistory(userId)
      res.json({ message: 'History cleared' })
    } catch (error) {
      next(error)
    }
  }

  async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const { type } = req.params
      const limit = parseInt(req.query.limit as string) || 10
      const recommendations = await this.aiService.getRecommendations(userId, type, limit)
      res.json(recommendations)
    } catch (error) {
      next(error)
    }
  }
}
