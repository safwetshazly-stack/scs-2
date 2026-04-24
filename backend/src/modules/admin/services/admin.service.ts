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
          _count: { select: { enrollments: true, coursesCreated: true, booksUploaded: true } },
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
  async getReports(limit = 20, offset = 0, resolved = false) {
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { isResolved: resolved },
        include: {
          reporter: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.report.count({ where: { isResolved: resolved } }),
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
        isResolved: true,
        description: report.description ? `${report.description}\n[RESOLVED] ${resolution}` : `[RESOLVED] ${resolution}`,
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

  /**
   * Delete course
   */
  async deleteCourse(courseId: string, reason: string = 'Admin deletion') {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course) {
      throw new AppError('Course not found', 404)
    }

    await this.prisma.$transaction(async (tx) => {
      const enrollments = await tx.courseEnrollment.findMany({
        where: { courseId },
        select: { userId: true },
      })

      for (const enroll of enrollments) {
        await tx.notification.create({
          data: {
            userId: enroll.userId,
            type: 'SYSTEM',
            title: 'Course Removed',
            body: `Course "${course.title}" has been removed: ${reason}`,
          },
        })
      }

      await tx.course.delete({ where: { id: courseId } })
    })

    logger.info(`Course deleted: ${courseId} - Reason: ${reason}`)
  }

  /**
   * Delete book
   */
  async deleteBook(bookId: string, reason: string = 'Admin deletion') {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } })
    if (!book) {
      throw new AppError('Book not found', 404)
    }

    await this.prisma.$transaction(async (tx) => {
      const purchases = await tx.bookPurchase.findMany({
        where: { bookId },
        select: { userId: true },
      })

      for (const purchase of purchases) {
        await tx.notification.create({
          data: {
            userId: purchase.userId,
            type: 'SYSTEM',
            title: 'Book Removed',
            body: `Book "${book.title}" has been removed: ${reason}`,
          },
        })
      }

      await tx.book.delete({ where: { id: bookId } })
    })

    logger.info(`Book deleted: ${bookId} - Reason: ${reason}`)
  }

  /**
   * Approve platform
   */
  async approvePlatform(requestId: string) {
    const request = await this.prisma.platformRequest.findUnique({
      where: { id: requestId },
    })
    if (!request) {
      throw new AppError('Platform request not found', 404)
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.platformRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      })

      await tx.platform.create({
        data: {
          ownerId: request.userId,
          name: request.name,
          slug: request.name.toLowerCase().replace(/\s+/g, '-'),
          description: request.description,
          status: 'APPROVED',
        },
      })

      await tx.notification.create({
        data: {
          userId: request.userId,
          type: 'SYSTEM',
          title: 'Platform Approved',
          body: `Your platform "${request.name}" has been approved!`,
        },
      })
    })

    logger.info(`Platform approved: ${requestId}`)
  }

  /**
   * Reject platform
   */
  async rejectPlatform(requestId: string, reason: string = 'Not approved') {
    const request = await this.prisma.platformRequest.findUnique({
      where: { id: requestId },
    })
    if (!request) {
      throw new AppError('Platform request not found', 404)
    }

    await this.prisma.platformRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        notes: reason,
      },
    })

    await this.prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'SYSTEM',
        title: 'Platform Rejected',
        body: `Your platform request was rejected: ${reason}`,
      },
    })

    logger.info(`Platform rejected: ${requestId} - Reason: ${reason}`)
  }

  /**
   * Comprehensive fraud detection with risk scoring
   */
  async detectFraud(hoursToCheck = 24) {
    const sinceDate = new Date(Date.now() - hoursToCheck * 60 * 60 * 1000)

    // Get suspicious activity from security logs
    const suspiciousAlerts = await this.prisma.securityLog.findMany({
      where: {
        createdAt: { gte: sinceDate },
        isResolved: false,
      },
      include: {
        user: { select: { username: true, email: true } },
      },
      orderBy: { riskScore: 'desc' },
      take: 50,
    })

    // Calculate user risk profiles
    const userRisks = new Map<string, { userId: string; riskScore: number; reasons: string[] }>()

    for (const alert of suspiciousAlerts) {
      const existing = userRisks.get(alert.userId) || {
        userId: alert.userId,
        riskScore: 0,
        reasons: [],
      }

      existing.riskScore += alert.riskScore
      existing.reasons.push(`${alert.alertType}(${alert.riskScore})`)

      userRisks.set(alert.userId, existing)
    }

    // Detect abnormal downloads
    const abnormalDownloads = await this.prisma.downloadLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: sinceDate },
      },
      _count: { id: true },
      having: {
        id: { _gt: 50 }, // More than 50 downloads in the period
      },
    })

    for (const download of abnormalDownloads) {
      const existing = userRisks.get(download.userId) || {
        userId: download.userId,
        riskScore: 0,
        reasons: [],
      }

      const riskIncrease = Math.min(30, download._count.id * 2)
      existing.riskScore += riskIncrease
      existing.reasons.push(`AbnormalDownloads(${download._count.id})`)

      userRisks.set(download.userId, existing)
    }

    // Detect rapid purchases
    const rapidPurchases = await this.prisma.payment.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: sinceDate },
        status: 'COMPLETED',
      },
      _count: { id: true },
      having: {
        id: { _gt: 20 }, // More than 20 purchases
      },
    })

    for (const purchase of rapidPurchases) {
      const existing = userRisks.get(purchase.userId) || {
        userId: purchase.userId,
        riskScore: 0,
        reasons: [],
      }

      const riskIncrease = Math.min(40, purchase._count.id * 2)
      existing.riskScore += riskIncrease
      existing.reasons.push(`RapidPurchases(${purchase._count.id})`)

      userRisks.set(purchase.userId, existing)
    }

    // Detect multiple devices from different regions
    const multiDeviceUsers = await this.prisma.device.groupBy({
      by: ['userId'],
      where: {
        lastActiveAt: { gte: sinceDate },
      },
      _count: { id: true },
      having: {
        id: { _gt: 5 }, // More than 5 devices
      },
    })

    for (const md of multiDeviceUsers) {
      const existing = userRisks.get(md.userId) || {
        userId: md.userId,
        riskScore: 0,
        reasons: [],
      }

      existing.riskScore += 25
      existing.reasons.push(`MultipleDevices(${md._count.id})`)

      userRisks.set(md.userId, existing)
    }

    // Sort by risk score
    const sortedRisks = Array.from(userRisks.values()).sort((a, b) => b.riskScore - a.riskScore)

    // Get detailed user info for high-risk users
    const highRiskUsers = []
    for (const risk of sortedRisks.slice(0, 20)) {
      if (risk.riskScore > 50) {
        const user = await this.prisma.user.findUnique({
          where: { id: risk.userId },
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            subscriptionTier: true,
          },
        })

        if (user) {
          highRiskUsers.push({
            ...user,
            riskScore: Math.min(100, risk.riskScore),
            riskReasons: risk.reasons,
          })
        }
      }
    }

    return {
      highRiskUsers,
      totalFraudAlertsFound: sortedRisks.filter((r) => r.riskScore > 50).length,
      lastChecked: new Date(),
      checkPeriodHours: hoursToCheck,
    }
  }

  /**
   * Calculate user fraud risk score
   */
  async calculateUserRiskScore(userId: string): Promise<{
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high'
    factors: { factor: string; score: number }[]
  }> {
    try {
      const factors: { factor: string; score: number }[] = []
      let totalRisk = 0

      // Factor 1: Recent security alerts
      const recentAlerts = await this.prisma.securityLog.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          isResolved: false,
        },
      })

      const alertRisk = Math.min(30, recentAlerts.length * 5)
      if (alertRisk > 0) {
        factors.push({ factor: 'Recent_Security_Alerts', score: alertRisk })
        totalRisk += alertRisk
      }

      // Factor 2: Multiple active devices
      const activeDevices = await this.prisma.device.count({
        where: {
          userId,
          lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })

      const deviceRisk = Math.min(25, Math.max(0, (activeDevices - 2) * 5))
      if (deviceRisk > 0) {
        factors.push({ factor: 'Multiple_Devices', score: deviceRisk })
        totalRisk += deviceRisk
      }

      // Factor 3: Concurrent streaming
      const concurrentStreams = await this.prisma.streamingToken.count({
        where: {
          userId,
          isValid: true,
          expiresAt: { gt: new Date() },
        },
      })

      const streamRisk = Math.min(20, concurrentStreams * 5)
      if (streamRisk > 0) {
        factors.push({ factor: 'Concurrent_Streams', score: streamRisk })
        totalRisk += streamRisk
      }

      // Factor 4: Recent downloads
      const recentDownloads = await this.prisma.downloadLog.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      })

      const downloadRisk = Math.min(15, recentDownloads)
      if (downloadRisk > 0) {
        factors.push({ factor: 'Recent_Downloads', score: downloadRisk })
        totalRisk += downloadRisk
      }

      // Factor 5: Recent purchases
      const recentPurchases = await this.prisma.payment.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          status: 'COMPLETED',
        },
      })

      const purchaseRisk = Math.min(10, recentPurchases * 2)
      if (purchaseRisk > 0) {
        factors.push({ factor: 'Recent_Purchases', score: purchaseRisk })
        totalRisk += purchaseRisk
      }

      const finalRisk = Math.min(100, totalRisk)
      const riskLevel: 'low' | 'medium' | 'high' = finalRisk < 33 ? 'low' : finalRisk < 67 ? 'medium' : 'high'

      return {
        riskScore: finalRisk,
        riskLevel,
        factors: factors.sort((a, b) => b.score - a.score),
      }
    } catch (error) {
      logger.error('Error calculating user risk score:', error)
      return {
        riskScore: 0,
        riskLevel: 'low',
        factors: [],
      }
    }
  }
}

        amount: { gt: 1000 },
      },
      include: { user: true },
    })

    result.suspiciousPayments = suspiciousPayments

    // Detect accounts with unusual activity
    const activityLogs = await this.prisma.activityLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
      },
      select: { userId: true },
    })

    // Group by userId and count
    const activityMap = new Map<string, number>()
    activityLogs.forEach((log) => {
      const userId = log.userId || 'unknown'
      activityMap.set(userId, (activityMap.get(userId) || 0) + 1)
    })
    result.suspiciousAccounts = Array.from(activityMap.entries())
      .filter(([_, count]) => count > 100)
      .map(([userId, count]) => ({ userId, activities: count }))

    logger.info(`Fraud detection completed. Found ${result.suspiciousPayments.length} suspicious payments`)

    return result
  }
}
