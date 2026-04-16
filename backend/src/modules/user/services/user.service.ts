/**
 * User Service
 * Handles user profiles, settings, and social relationships
 */

import { PrismaClient } from '@prisma/client'
import { RedisClientType } from 'redis'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export class UserService {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisClientType
  ) {}

  /**
   * Get user profile by username
   */
  async getProfile(username: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        profile: true,
        _count: {
          select: {
            followers: true,
            following: true,
            coursesCreated: true,
            enrollments: true,
            communitiesOwned: true,
          },
        },
      },
    })

    if (!user) throw new AppError('User not found', 404)

    let isFollowing = false
    if (currentUserId && currentUserId !== user.id) {
      const follow = await this.prisma.follow.findFirst({
        where: { followerId: currentUserId, followingId: user.id },
      })
      isFollowing = !!follow
    }

    return { ...user, isFollowing }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: {
      bio?: string
      country?: string
      city?: string
      university?: string
      major?: string
      website?: string
      githubUrl?: string
      linkedinUrl?: string
      skills?: string[]
      avatar?: string
      coverImage?: string
    }
  ) {
    const profile = await this.prisma.userProfile.update({
      where: { userId },
      data,
    })

    // Invalidate cache
    await this.redis.del(`user:${userId}`)
    logger.info(`Profile updated: ${userId}`)

    return profile
  }

  /**
   * Update user settings
   */
  async updateSettings(
    userId: string,
    data: {
      language?: string
      theme?: string
      emailNotifications?: boolean
      pushNotifications?: boolean
      showOnlineStatus?: boolean
      showLastSeen?: boolean
      allowMessages?: boolean
    }
  ) {
    return await this.prisma.userSettings.update({
      where: { userId },
      data,
    })
  }

  /**
   * Follow a user
   */
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new AppError('Cannot follow yourself', 400)
    }

    // Check if blocked
    const blocked = await this.prisma.blockedUser.findFirst({
      where: { blockerId: followingId, blockedId: followerId },
    })

    if (blocked) {
      throw new AppError('Action not permitted', 403)
    }

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    })

    // Create notification
    const follower = await this.prisma.user.findUnique({ where: { id: followerId }, select: { username: true } })
    await this.prisma.notification.create({
      data: {
        userId: followingId,
        type: 'FOLLOW',
        title: 'New Follower',
        body: `${follower?.username || 'Someone'} started following you`,
        data: { userId: followerId },
      },
    })

    logger.info(`${followerId} followed ${followingId}`)
  }

  /**
   * Unfollow a user
   */
  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    })

    logger.info(`${followerId} unfollowed ${followingId}`)
  }

  /**
   * Get followers
   */
  async getFollowers(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } })
    if (!user) throw new AppError('User not found', 404)

    const followers = await this.prisma.follow.findMany({
      where: { followingId: user.id },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            profile: { select: { avatar: true, bio: true } },
          },
        },
      },
    })

    return followers.map((f) => f.follower)
  }

  /**
   * Get following
   */
  async getFollowing(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } })
    if (!user) throw new AppError('User not found', 404)

    const following = await this.prisma.follow.findMany({
      where: { followerId: user.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            profile: { select: { avatar: true, bio: true } },
          },
        },
      },
    })

    return following.map((f) => f.following)
  }

  /**
   * Block user
   */
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new AppError('Cannot block yourself', 400)
    }

    // Remove any existing follow relationship
    await this.prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    })

    // Create block
    await this.prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    })

    logger.info(`${blockerId} blocked ${blockedId}`)
  }

  /**
   * Unblock user
   */
  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.blockedUser.deleteMany({
      where: { blockerId, blockedId },
    })

    logger.info(`${blockerId} unblocked ${blockedId}`)
  }

  /**
   * Delete account
   */
  async deleteAccount(userId: string) {
    await this.prisma.$transaction([
      this.prisma.userSession.deleteMany({ where: { userId } }),
      this.prisma.emailVerification.deleteMany({ where: { userId } }),
      this.prisma.passwordReset.deleteMany({ where: { userId } }),
      this.prisma.loginAttempt.deleteMany({ where: { userId } }),
    ])

    await this.prisma.user.delete({ where: { id: userId } })

    await this.redis.del(`user:${userId}`)
    logger.warn(`Account deleted: ${userId}`)
  }
}
