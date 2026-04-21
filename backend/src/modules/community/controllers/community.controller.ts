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
      const { name, description, isPrivate } = req.body
      const community = await this.communityService.createCommunity(ownerId, { name, description, isPrivate })
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
        isPrivate: req.query.isPrivate === 'true' ? true : req.query.isPrivate === 'false' ? false : undefined,
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

  async getCommunity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const community = await this.communityService.getCommunity(id)
      res.json(community)
    } catch (error) {
      next(error)
    }
  }

  async updateCommunity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const ownerId = req.user?.id!
      const data = req.body
      const community = await this.communityService.updateCommunity(id, ownerId, data)
      res.json(community)
    } catch (error) {
      next(error)
    }
  }

  async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = req.user?.id!
      const { content, mediaUrls } = req.body
      const post = await this.communityService.createPost(id, userId, { content, mediaUrls })
      res.status(201).json(post)
    } catch (error) {
      next(error)
    }
  }

  async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const result = await this.communityService.getPosts(id, limit, offset)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async commentOnPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params
      const userId = req.user?.id!
      const { content, parentId } = req.body
      const comment = await this.communityService.commentOnPost(postId, userId, content, parentId)
      res.status(201).json(comment)
    } catch (error) {
      next(error)
    }
  }

  async likePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params
      const userId = req.user?.id!
      await this.communityService.likePost(postId, userId)
      res.json({ message: 'Post liked' })
    } catch (error) {
      next(error)
    }
  }

  async unlikePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params
      const userId = req.user?.id!
      await this.communityService.unlikePost(postId, userId)
      res.json({ message: 'Post unliked' })
    } catch (error) {
      next(error)
    }
  }

  async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params
      const userId = req.user?.id!
      await this.communityService.deletePost(postId, userId)
      res.json({ message: 'Post deleted' })
    } catch (error) {
      next(error)
    }
  }
}
