/**
 * Admin Service
 * Handles administrative operations, user management, and platform analytics
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Check admin access
   */
  async requireAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || user.role !== 'ADMIN') {
      throw new AppError('Admin access required', 403)
    }
  }

  /**
   * Get all users with pagination
   */
  async getUsers(limit = 20, offset = 0, filters?: { search?: string; role?: string; banned?: boolean }) {
    const where: any = {}

    if (filters?.search) {
      where.OR = [{ username: { contains: filters.search, mode: 'insensitive' } }, { email: { contains: filters.search, mode: 'insensitive' } }]
    }

    if (filters?.role) {
      where.role = filters.role
    }

    if (filters?.banned !== undefined) {
      where.isBanned = filters.banned
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          profile: { select: { avatar: true } },
          _count: { select: { enrollments: true, coursesCreated: true, booksAuthored: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ])

    return { users, total }
  }

  /**
   * Ban user
   */
  async banUser(userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
      },
    })

    logger.warn(`User banned: ${userId} - Reason: ${reason}`)
  }

  /**
   * Unban user
   */
  async unbanUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
      },
    })

    logger.warn(`User unbanned: ${userId}`)
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics() {
    const [
      totalUsers,
      totalCourses,
      totalBooks,
      totalEnrollments,
      totalBookPurchases,
      totalRevenue,
      activeToday,
      newUsersThisWeek,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.book.count(),
      this.prisma.courseEnrollment.count(),
      this.prisma.bookPurchase.count(),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.loginAttempt.count({
        where: {
          success: true,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    return {
      totalUsers,
      totalCourses,
      totalBooks,
      totalEnrollments,
      totalBookPurchases,
      totalRevenue: totalRevenue._sum.amount || 0,
      activeToday,
      newUsersThisWeek,
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [logins, signups, enrollments, purchases] = await Promise.all([
      this.prisma.loginAttempt.groupBy({
        by: ['createdAt'],
        where: { success: true, createdAt: { gte: startDate } },
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: startDate } },
        _count: { id: true },
      }),
      this.prisma.courseEnrollment.groupBy({
        by: ['enrolledAt'],
        where: { enrolledAt: { gte: startDate } },
        _count: { id: true },
      }),
      this.prisma.bookPurchase.groupBy({
        by: ['purchasedAt'],
        where: { purchasedAt: { gte: startDate } },
        _count: { id: true },
      }),
    ])

    return { logins, signups, enrollments, purchases }
  }

  /**
   * Get reported content
   */
  async getReports(limit = 20, offset = 0, status = 'PENDING') {
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { status },
        include: {
          reporter: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.report.count({ where: { status } }),
    ])

    return { reports, total }
  }

  /**
   * Resolve report
   */
  async resolveReport(reportId: string, resolution: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      throw new AppError('Report not found', 404)
    }

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        resolution,
        resolvedAt: new Date(),
      },
    })

    logger.info(`Report resolved: ${reportId} - ${resolution}`)
  }

  /**
   * Get recent activity logs
   */
  async getActivityLogs(limit = 50, offset = 0) {
    return await this.prisma.activityLog.findMany({
      include: {
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }
}
