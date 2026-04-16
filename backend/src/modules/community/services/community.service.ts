/**
 * Community Service
 * Handles community groups, discussions, and social features
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { slugify } from '../../../utils/slugify'

export class CommunityService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create community
   */
  async createCommunity(ownerId: string, data: { name: string; description: string; category: string }) {
    const slug = slugify(data.name) + '-' + Date.now()

    const community = await this.prisma.community.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        category: data.category,
        ownerId,
      },
    })

    // Add creator as member
    await this.prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: ownerId,
        role: 'ADMIN',
      },
    })

    logger.info(`Community created: ${community.id} by ${ownerId}`)
    return community
  }

  /**
   * Get communities with pagination
   */
  async getCommunities(limit = 20, offset = 0, filters?: { search?: string; category?: string }) {
    const where: any = {}

    if (filters?.search) {
      where.OR = [{ name: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }]
    }

    if (filters?.category) {
      where.category = filters.category
    }

    const [communities, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        include: {
          owner: { select: { username: true } },
          _count: { select: { members: true, discussions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.community.count({ where }),
    ])

    return { communities, total }
  }

  /**
   * Join community
   */
  async joinCommunity(communityId: string, userId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } })
    if (!community) {
      throw new AppError('Community not found', 404)
    }

    const existing = await this.prisma.communityMember.findFirst({
      where: { communityId, userId },
    })

    if (existing) {
      throw new AppError('Already a member', 409)
    }

    const member = await this.prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role: 'MEMBER',
      },
    })

    logger.info(`User ${userId} joined community ${communityId}`)
    return member
  }

  /**
   * Leave community
   */
  async leaveCommunity(communityId: string, userId: string) {
    const member = await this.prisma.communityMember.findFirst({
      where: { communityId, userId },
    })

    if (!member) {
      throw new AppError('Not a member', 404)
    }

    await this.prisma.communityMember.delete({
      where: { id: member.id },
    })

    logger.info(`User ${userId} left community ${communityId}`)
  }

  /**
   * Create discussion
   */
  async createDiscussion(communityId: string, userId: string, data: { title: string; content: string }) {
    const member = await this.prisma.communityMember.findFirst({
      where: { communityId, userId },
    })

    if (!member) {
      throw new AppError('Not a member of this community', 403)
    }

    const discussion = await this.prisma.discussion.create({
      data: {
        communityId,
        creatorId: userId,
        title: data.title,
        content: data.content,
      },
    })

    logger.info(`Discussion created: ${discussion.id} in community ${communityId}`)
    return discussion
  }

  /**
   * Get discussions in community
   */
  async getDiscussions(communityId: string, limit = 20, offset = 0) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } })
    if (!community) {
      throw new AppError('Community not found', 404)
    }

    const [discussions, total] = await Promise.all([
      this.prisma.discussion.findMany({
        where: { communityId },
        include: {
          creator: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.discussion.count({ where: { communityId } }),
    ])

    return { discussions, total }
  }

  /**
   * Reply to discussion
   */
  async replyDiscussion(discussionId: string, userId: string, content: string) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
    })

    if (!discussion) {
      throw new AppError('Discussion not found', 404)
    }

    const reply = await this.prisma.discussionReply.create({
      data: {
        discussionId,
        creatorId: userId,
        content,
      },
    })

    logger.info(`Reply created: ${reply.id} in discussion ${discussionId}`)
    return reply
  }
}
