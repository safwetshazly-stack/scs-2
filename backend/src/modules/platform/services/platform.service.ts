/**
 * Platform Service
 * Handles creator platforms, revenue sharing, and platform-specific content
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { slugify } from '../../../utils/slugify'

export class PlatformService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create platform
   */
  async createPlatform(ownerId: string, data: { name: string; description: string; commissionRate: number }) {
    const slug = slugify(data.name) + '-' + Date.now()

    const platform = await this.prisma.platform.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        ownerId,
        commissionRate: Math.min(50, Math.max(0, data.commissionRate)),
      },
    })

    logger.info(`Platform created: ${platform.id} by ${ownerId}`)
    return platform
  }

  /**
   * Get all platforms
   */
  async getPlatforms(limit = 20, offset = 0) {
    const [platforms, total] = await Promise.all([
      this.prisma.platform.findMany({
        include: {
          owner: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
          _count: { select: { courses: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.platform.count(),
    ])

    return { platforms, total }
  }

  /**
   * Get platform details
   */
  async getPlatform(platformId: string) {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      include: {
        owner: { select: { id: true, username: true, profile: { select: { avatar: true, bio: true } } } },
        courses: {
          include: {
            instructor: { select: { username: true } },
            _count: { select: { enrollments: true } },
          },
        },
        _count: { select: { courses: true, joinRequests: true } },
      },
    })

    if (!platform) {
      throw new AppError('Platform not found', 404)
    }

    return platform
  }

  /**
   * Update platform
   */
  async updatePlatform(platformId: string, ownerId: string, data: Partial<any>) {
    const platform = await this.prisma.platform.findUnique({ where: { id: platformId } })
    if (!platform || platform.ownerId !== ownerId) {
      throw new AppError('Not authorized', 403)
    }

    if (data.commissionRate) {
      data.commissionRate = Math.min(50, Math.max(0, data.commissionRate))
    }

    const updated = await this.prisma.platform.update({
      where: { id: platformId },
      data,
    })

    logger.info(`Platform updated: ${platformId}`)
    return updated
  }

  /**
   * Request to join platform
   */
  async requestJoin(platformId: string, userId: string) {
    const platform = await this.prisma.platform.findUnique({ where: { id: platformId } })
    if (!platform) {
      throw new AppError('Platform not found', 404)
    }

    const existing = await this.prisma.platformJoinRequest.findFirst({
      where: { platformId, creatorId: userId },
    })

    if (existing) {
      throw new AppError('Request already pending', 409)
    }

    const request = await this.prisma.platformJoinRequest.create({
      data: {
        platformId,
        creatorId: userId,
        status: 'PENDING',
      },
    })

    logger.info(`Join request created: ${userId} for platform ${platformId}`)
    return request
  }

  /**
   * Approve join request (platform owner only)
   */
  async approveJoinRequest(requestId: string, ownerId: string) {
    const request = await this.prisma.platformJoinRequest.findUnique({
      where: { id: requestId },
      include: { platform: true },
    })

    if (!request || request.platform.ownerId !== ownerId) {
      throw new AppError('Not authorized', 403)
    }

    await this.prisma.platformJoinRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    })

    logger.info(`Join request approved: ${requestId}`)
  }

  /**
   * Get platform revenue analytics
   */
  async getRevenue(platformId: string, ownerId: string) {
    const platform = await this.prisma.platform.findUnique({ where: { id: platformId } })
    if (!platform || platform.ownerId !== ownerId) {
      throw new AppError('Not authorized', 403)
    }

    const courses = await this.prisma.course.findMany({
      where: { platformId },
      include: {
        enrollments: true,
        _count: { select: { enrollments: true } },
      },
    })

    let totalRevenue = 0
    const courseRevenue = courses.map((course) => {
      const revenue = course.price * course._count.enrollments
      totalRevenue += revenue
      return {
        courseId: course.id,
        title: course.title,
        enrollments: course._count.enrollments,
        revenue,
      }
    })

    return {
      totalRevenue,
      commissionRate: platform.commissionRate,
      platformEarnings: (totalRevenue * platform.commissionRate) / 100,
      creatorEarnings: totalRevenue - (totalRevenue * platform.commissionRate) / 100,
      courses: courseRevenue,
    }
  }
}
