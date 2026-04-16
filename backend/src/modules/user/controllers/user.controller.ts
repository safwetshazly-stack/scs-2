/**
 * User Controller (Refactored)
 * Thin HTTP request/response handler
 * All business logic in UserService
 */

import { Request, Response, NextFunction } from 'express'
import { UserService } from '../services/user.service'

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * GET /users/:username
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params
      const currentUserId = req.user?.id

      const user = await this.userService.getProfile(username, currentUserId)

      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PUT /users/profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const profileData = req.body

      const profile = await this.userService.updateProfile(userId, profileData)

      res.json(profile)
    } catch (error) {
      next(error)
    }
  }

  /**
   * PUT /users/settings
   */
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const settingsData = req.body

      const settings = await this.userService.updateSettings(userId, settingsData)

      res.json(settings)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /users/:id/follow
   */
  async follow(req: Request, res: Response, next: NextFunction) {
    try {
      const followerId = req.user?.id!
      const { id: followingId } = req.params

      await this.userService.follow(followerId, followingId)

      res.json({ message: 'Followed' })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /users/:id/follow
   */
  async unfollow(req: Request, res: Response, next: NextFunction) {
    try {
      const followerId = req.user?.id!
      const { id: followingId } = req.params

      await this.userService.unfollow(followerId, followingId)

      res.json({ message: 'Unfollowed' })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /users/:username/followers
   */
  async getFollowers(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params

      const followers = await this.userService.getFollowers(username)

      res.json(followers)
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /users/:username/following
   */
  async getFollowing(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params

      const following = await this.userService.getFollowing(username)

      res.json(following)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /users/:id/block
   */
  async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const blockerId = req.user?.id!
      const { id: blockedId } = req.params

      await this.userService.blockUser(blockerId, blockedId)

      res.json({ message: 'User blocked' })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /users/:id/block
   */
  async unblockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const blockerId = req.user?.id!
      const { id: blockedId } = req.params

      await this.userService.unblockUser(blockerId, blockedId)

      res.json({ message: 'User unblocked' })
    } catch (error) {
      next(error)
    }
  }

  /**
   * DELETE /users/account
   */
  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!

      await this.userService.deleteAccount(userId)

      res.json({ message: 'Account deleted' })
    } catch (error) {
      next(error)
    }
  }
}
