/**
 * Platform Service
 * Handles creator platform requests, approvals, ownership, and platform-specific content
 */

import { PrismaClient, PlatformStatus } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import slugify from '../../../utils/slugify'

export class PlatformService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 1. Create Platform Request
   * Initiates the workflow for a user attempting to establish a platform.
   */
  async createPlatformRequest(userId: string, data: { name: string; description?: string; notes?: string }) {
    // Validate if user already has pending requests to prevent spam
    const existingPending = await this.prisma.platformRequest.findFirst({
      where: { userId, status: PlatformStatus.PENDING }
    });

    if (existingPending) {
      throw new AppError('You already have a pending platform request.', 400);
    }

    const request = await this.prisma.platformRequest.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        notes: data.notes,
        status: PlatformStatus.PENDING,
      },
    });

    logger.info(`Platform request created by User: ${userId}`);
    return request;
  }

  /**
   * 2. Admin Review Request
   * Allows admins to approve or reject requests. Approved requests automatically provision a Platform constraint.
   */
  async reviewPlatformRequest(adminId: string, requestId: string, action: 'APPROVE' | 'REJECT', notes?: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      throw new AppError('Only administrators can review platform requests', 403);
    }

    const request = await this.prisma.platformRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new AppError('Platform request not found', 404);
    }

    if (request.status !== PlatformStatus.PENDING) {
      throw new AppError(`Request is already resolved (${request.status})`, 400);
    }

    if (action === 'REJECT') {
      const rejected = await this.prisma.platformRequest.update({
        where: { id: requestId },
        data: { status: PlatformStatus.REJECTED, notes },
      });
      logger.info(`Platform request ${requestId} REJECTED by Admin ${adminId}`);
      return rejected;
    }

    // action === 'APPROVE'
    const slug = slugify(request.name) + '-' + Date.now();

    // Transaction ensures Atomicity: We update the request AND manufacture the platform safely
    const [approvedRequest, newPlatform] = await this.prisma.$transaction([
      this.prisma.platformRequest.update({
        where: { id: requestId },
        data: { status: PlatformStatus.APPROVED, notes },
      }),
      this.prisma.platform.create({
        data: {
          ownerId: request.userId,
          name: request.name,
          slug,
          description: request.description,
          status: PlatformStatus.APPROVED,
          commissionRate: 0.08, // Business Rule Requirement: Platform 8%
          settings: {
            create: {
              allowGuests: true
            }
          }
        },
      })
    ]);

    // Backlink the tracking request to the actual platform created
    await this.prisma.platformRequest.update({
      where: { id: requestId },
      data: { platformId: newPlatform.id }
    });

    logger.info(`Platform request ${requestId} APPROVED. Platform ${newPlatform.id} created.`);
    return newPlatform;
  }

  /**
   * 3. Platform Dashboard Logic (Get specific platform)
   * Retrieves data needed on the dashboard enforcing logic limits.
   */
  async getPlatformById(platformId: string) {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      include: {
        owner: { select: { id: true, username: true, email: true } },
        settings: true,
        courses: {
          select: {
            id: true, title: true, price: true, status: true,
            _count: { select: { enrollments: true } }
          }
        },
        _count: { select: { courses: true } },
      },
    });

    if (!platform) {
      throw new AppError('Platform not found', 404);
    }

    // Revenue Placeholder logic explicitly tailored for Dashboard 
    let aggregatedRevenue = 0;
    const courseAnalytics = platform.courses.map((course) => {
      // Future-proofed logic assuming raw math. A true app queries `Transaction` properly.
      const rawRevenue = course.price * course._count.enrollments;
      const netRevenue = rawRevenue - (rawRevenue * platform.commissionRate);
      aggregatedRevenue += netRevenue;

      return {
        ...course,
        metrics: {
          rawRevenue,
          netRevenue
        }
      };
    });

    return {
      ...platform,
      dashboard: {
        totalNetRevenue: aggregatedRevenue,
        courses: courseAnalytics
      }
    };
  }

  /**
   * 4. Platform Ownership
   * Validates & queries all platforms owned by the user.
   */
  async getUserPlatforms(userId: string) {
    return await this.prisma.platform.findMany({
      where: { ownerId: userId },
      include: {
        settings: true,
        _count: { select: { courses: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * 5. Platform Customization
   * Strict update limits restricted by ownership validation.
   */
  async updatePlatform(platformId: string, ownerId: string, data: { name?: string, description?: string, colors?: any, template?: string }) {
    const platform = await this.prisma.platform.findUnique({ where: { id: platformId } })
    
    if (!platform) {
      throw new AppError('Platform not found', 404);
    }
    
    // Validate Strict Ownership
    if (platform.ownerId !== ownerId) {
      throw new AppError('Unauthorized: You do not own this platform', 403);
    }

    // Build patch request carefully handling JSON colors and string templates
    const patchData: any = {};
    if (data.name) {
      patchData.name = data.name;
      // Re-slug mechanism if name differs
      if (data.name !== platform.name) {
        patchData.slug = slugify(data.name) + '-' + Date.now();
      }
    }
    if (data.description !== undefined) patchData.description = data.description;
    if (data.colors !== undefined) patchData.colors = data.colors;
    if (data.template !== undefined) patchData.template = data.template;

    const updated = await this.prisma.platform.update({
      where: { id: platformId },
      data: patchData,
      include: { settings: true }
    });

    logger.info(`Platform Customization updated: ${platformId} by Owner ${ownerId}`);
    return updated;
  }

  /**
   * 6. Create Platform (API endpoint method)
   * Aliases createPlatformRequest for API compatibility
   */
  async createPlatform(ownerId: string, data: { name: string; description?: string; commissionRate?: number }) {
    return this.createPlatformRequest(ownerId, data);
  }

  /**
   * 7. Get Platforms (paginated list)
   * Returns all active platforms with pagination
   */
  async getPlatforms(limit: number = 20, offset: number = 0) {
    const platforms = await this.prisma.platform.findMany({
      where: { status: PlatformStatus.APPROVED },
      include: {
        owner: { select: { id: true, username: true } },
        settings: true,
        _count: { select: { courses: true } }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });

    const total = await this.prisma.platform.count({
      where: { status: PlatformStatus.APPROVED }
    });

    return { data: platforms, total, limit, offset };
  }

  /**
   * 8. Get Platform (single platform by ID)
   * Aliases getPlatformById for API compatibility
   */
  async getPlatform(platformId: string) {
    return this.getPlatformById(platformId);
  }

  /**
   * 9. Request to Join Platform
   * Creates a join request for a user wanting to access a platform
   */
  async requestJoin(platformId: string, userId: string) {
    const platform = await this.prisma.platform.findUnique({ where: { id: platformId } });
    if (!platform) {
      throw new AppError('Platform not found', 404);
    }

    // Check if user already has a pending request
    const existingRequest = await this.prisma.platformRequest.findFirst({
      where: { platformId, userId, status: PlatformStatus.PENDING }
    });

    if (existingRequest) {
      throw new AppError('You already have a pending request for this platform', 400);
    }

    const request = await this.prisma.platformRequest.create({
      data: {
        userId,
        platformId,
        name: platform.name,
        status: PlatformStatus.PENDING,
      },
    });

    logger.info(`User ${userId} requested to join platform ${platformId}`);
    return request;
  }

  /**
   * 10. Approve Join Request
   * Admin/Platform owner approves a join request
   */
  async approveJoinRequest(requestId: string, ownerId: string) {
    const request = await this.prisma.platformRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new AppError('Platform request not found', 404);
    }

    // Verify owner/admin
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!user || (user.role !== 'ADMIN' && user.id !== request.userId)) {
      throw new AppError('Unauthorized to approve this request', 403);
    }

    const updated = await this.prisma.platformRequest.update({
      where: { id: requestId },
      data: { status: PlatformStatus.APPROVED }
    });

    logger.info(`Join request ${requestId} approved by ${ownerId}`);
    return updated;
  }

  /**
   * 11. Get Revenue Analytics
   * Returns platform revenue and analytics for the owner
   */
  async getRevenue(platformId: string, ownerId: string) {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      include: {
        courses: {
          select: {
            id: true,
            title: true,
            price: true,
            _count: { select: { enrollments: true } }
          }
        }
      }
    });

    if (!platform) {
      throw new AppError('Platform not found', 404);
    }

    // Verify ownership
    if (platform.ownerId !== ownerId) {
      throw new AppError('Unauthorized: You do not own this platform', 403);
    }

    let totalRevenue = 0;
    let totalNetRevenue = 0;

    const courseBreakdown = platform.courses.map((course) => {
      const revenue = course.price * course._count.enrollments;
      const netRevenue = revenue * (1 - platform.commissionRate);
      totalRevenue += revenue;
      totalNetRevenue += netRevenue;

      return {
        courseId: course.id,
        courseName: course.title,
        enrollments: course._count.enrollments,
        price: course.price,
        revenue,
        netRevenue
      };
    });

    return {
      platformId,
      totalRevenue,
      totalNetRevenue,
      commissionRate: platform.commissionRate,
      courses: courseBreakdown
    };
  }
}

