/**
 * Community Service
 * Handles community groups, posts, and social features
 */

import { PrismaClient, CommunityMemberRole } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import slugify from '../../../utils/slugify'

export class CommunityService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create community
   */
  async createCommunity(ownerId: string, data: { name: string; description?: string; isPrivate?: boolean }) {
    const slug = slugify(data.name) + '-' + Date.now()

    const community = await this.prisma.community.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        isPrivate: data.isPrivate ?? false,
        ownerId,
      },
    })

    // Add creator as owner member
    await this.prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: ownerId,
        role: CommunityMemberRole.OWNER,
      },
    })

    // Create default channel
    await this.prisma.communityChannel.create({
      data: {
        communityId: community.id,
        name: 'general',
        description: 'General discussion',
        type: 'TEXT',
      },
    })

    logger.info(`Community created: ${community.id} by ${ownerId}`)
    return community
  }

  /**
   * Get communities with pagination
   */
  async getCommunities(limit = 20, offset = 0, filters?: { search?: string; isPrivate?: boolean }) {
    const where: any = {}

    if (filters?.search) {
      where.OR = [{ name: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }]
    }

    if (filters?.isPrivate !== undefined) {
      where.isPrivate = filters.isPrivate
    }

    const [communities, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        include: {
          owner: { select: { username: true } },
          _count: { select: { members: true, posts: true } },
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
   * Get single community
   */
  async getCommunity(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        owner: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
        _count: { select: { members: true, posts: true, channels: true } },
        channels: { orderBy: { position: 'asc' } },
      },
    })

    if (!community) {
      throw new AppError('Community not found', 404)
    }

    return community
  }

  /**
   * Update community
   */
  async updateCommunity(communityId: string, ownerId: string, data: Partial<{ name: string; description: string; isPrivate: boolean; avatar: string; coverImage: string }>) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } })
    if (!community || community.ownerId !== ownerId) {
      throw new AppError('Not authorized', 403)
    }

    const updated = await this.prisma.community.update({
      where: { id: communityId },
      data,
    })

    logger.info(`Community updated: ${communityId}`)
    return updated
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
        role: CommunityMemberRole.MEMBER,
      },
    })

    await this.prisma.community.update({
      where: { id: communityId },
      data: { membersCount: { increment: 1 } },
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

    if (member.role === CommunityMemberRole.OWNER) {
      throw new AppError('Owner cannot leave community. Transfer ownership first.', 400)
    }

    await this.prisma.communityMember.delete({
      where: { id: member.id },
    })

    await this.prisma.community.update({
      where: { id: communityId },
      data: { membersCount: { decrement: 1 } },
    })

    logger.info(`User ${userId} left community ${communityId}`)
  }

  /**
   * Create post in community
   */
  async createPost(communityId: string, userId: string, data: { content: string; mediaUrls?: string[] }) {
    const member = await this.prisma.communityMember.findFirst({
      where: { communityId, userId },
    })

    if (!member) {
      throw new AppError('Not a member of this community', 403)
    }

    const post = await this.prisma.post.create({
      data: {
        communityId,
        authorId: userId,
        content: data.content,
        mediaUrls: data.mediaUrls || [],
      },
    })

    logger.info(`Post created: ${post.id} in community ${communityId}`)
    return post
  }

  /**
   * Get posts in community
   */
  async getPosts(communityId: string, limit = 20, offset = 0) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } })
    if (!community) {
      throw new AppError('Community not found', 404)
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { communityId, deletedAt: null },
        include: {
          author: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
          _count: { select: { likes: true, comments: true } },
          tags: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.post.count({ where: { communityId, deletedAt: null } }),
    ])

    return { posts, total }
  }

  /**
   * Comment on post
   */
  async commentOnPost(postId: string, userId: string, content: string, parentId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post || post.deletedAt) {
      throw new AppError('Post not found', 404)
    }

    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        authorId: userId,
        content,
        parentId: parentId || null,
      },
    })

    logger.info(`Comment created: ${comment.id} on post ${postId}`)
    return comment
  }

  /**
   * Like a post
   */
  async likePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } })
    if (!post || post.deletedAt) {
      throw new AppError('Post not found', 404)
    }

    await this.prisma.postLike.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    })

    await this.prisma.post.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
    })

    logger.info(`Post liked: ${postId} by ${userId}`)
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, userId: string) {
    const like = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    })

    if (!like) {
      throw new AppError('Not liked', 404)
    }

    await this.prisma.postLike.delete({
      where: { id: like.id },
    })

    await this.prisma.post.update({
      where: { id: postId },
      data: { likesCount: { decrement: 1 } },
    })

    logger.info(`Post unliked: ${postId} by ${userId}`)
  }

  /**
   * Delete post (moderator/owner only)
   */
  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      throw new AppError('Post not found', 404)
    }

    // Check if user is author, community owner, or moderator
    const member = await this.prisma.communityMember.findFirst({
      where: { communityId: post.communityId, userId },
    })

    if (!member || (post.authorId !== userId && member.role === CommunityMemberRole.MEMBER)) {
      throw new AppError('Not authorized', 403)
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    })

    logger.info(`Post deleted: ${postId}`)
  }
}
