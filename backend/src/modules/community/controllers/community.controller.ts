/**
 * Community Controller
 */

import { Request, Response, NextFunction } from 'express'
import { CommunityService } from '../services/community.service'

export class CommunityController {
  constructor(private communityService: CommunityService) {}

  async createCommunity(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user?.id!
      const { name, description, category } = req.body
      const community = await this.communityService.createCommunity(ownerId, { name, description, category })
      res.status(201).json(community)
    } catch (error) {
      next(error)
    }
  }

  async getCommunities(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const filters = {
        search: req.query.search as string,
        category: req.query.category as string,
      }
      const result = await this.communityService.getCommunities(limit, offset, filters)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async joinCommunity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.id!
      await this.communityService.joinCommunity(id, userId)
      res.json({ message: 'Joined community' })
    } catch (error) {
      next(error)
    }
  }

  async leaveCommunity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.id!
      await this.communityService.leaveCommunity(id, userId)
      res.json({ message: 'Left community' })
    } catch (error) {
      next(error)
    }
  }

  async createDiscussion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.id!
      const { title, content } = req.body
      const discussion = await this.communityService.createDiscussion(id, userId, { title, content })
      res.status(201).json(discussion)
    } catch (error) {
      next(error)
    }
  }

  async getDiscussions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const result = await this.communityService.getDiscussions(id, limit, offset)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async replyDiscussion(req: Request, res: Response, next: NextFunction) {
    try {
      const { discussionId } = req.params
      const userId = req.user?.id!
      const { content } = req.body
      const reply = await this.communityService.replyDiscussion(discussionId, userId, content)
      res.status(201).json(reply)
    } catch (error) {
      next(error)
    }
  }
}
