import { PrismaClient, AuditAction } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

interface LogAuditInput {
  userId: string
  action: AuditAction
  metadata?: Record<string, any>
  ipAddress?: string
  deviceId?: string
}

export class AuditLogService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log an audit event
   */
  async logAudit(input: LogAuditInput): Promise<any> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          metadata: input.metadata || {},
          ipAddress: input.ipAddress,
          deviceId: input.deviceId,
        },
      })

      logger.info(`Audit log created: ${input.action} for user: ${input.userId}`)

      return auditLog
    } catch (error) {
      logger.error('Error creating audit log:', error)
      // Don't throw - audit logging failures shouldn't break the app
      return null
    }
  }

  /**
   * Get user's audit trail
   */
  async getUserAuditTrail(userId: string, limit = 100, offset = 0): Promise<{
    logs: any[]
    total: number
  }> {
    try {
      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.auditLog.count({ where: { userId } }),
      ])

      return { logs, total }
    } catch (error) {
      logger.error('Error fetching audit trail:', error)
      throw new AppError('Failed to fetch audit trail', 500)
    }
  }

  /**
   * Get audit logs for a specific action
   */
  async getLogsByAction(userId: string, action: AuditAction, limit = 50): Promise<any[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: { userId, action },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    } catch (error) {
      logger.error('Error fetching logs by action:', error)
      throw new AppError('Failed to fetch logs', 500)
    }
  }

  /**
   * Get all audit logs for a time period (for admins)
   */
  async getAuditLogsByTimeRange(startDate: Date, endDate: Date, limit = 500): Promise<any[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    } catch (error) {
      logger.error('Error fetching audit logs by time range:', error)
      throw new AppError('Failed to fetch logs', 500)
    }
  }

  /**
   * Log login action
   */
  async logLogin(userId: string, ipAddress?: string, deviceId?: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'LOGIN',
      ipAddress,
      deviceId,
      metadata: { timestamp: new Date().toISOString() },
    })
  }

  /**
   * Log logout action
   */
  async logLogout(userId: string, ipAddress?: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'LOGOUT',
      ipAddress,
      metadata: { timestamp: new Date().toISOString() },
    })
  }

  /**
   * Log download action
   */
  async logDownload(userId: string, resourceId: string, ipAddress?: string, deviceId?: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'DOWNLOAD',
      ipAddress,
      deviceId,
      metadata: { resourceId, timestamp: new Date().toISOString() },
    })
  }

  /**
   * Log purchase action
   */
  async logPurchase(userId: string, itemId: string, amount: number, ipAddress?: string, deviceId?: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'PURCHASE',
      ipAddress,
      deviceId,
      metadata: {
        itemId,
        amount,
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Log stream action
   */
  async logStream(userId: string, resourceId: string, ipAddress?: string, deviceId?: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'STREAM',
      ipAddress,
      deviceId,
      metadata: { resourceId, timestamp: new Date().toISOString() },
    })
  }

  /**
   * Log AI usage
   */
  async logAiUsage(userId: string, tokensUsed: number, ipAddress?: string, deviceId?: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'AI_USAGE',
      ipAddress,
      deviceId,
      metadata: {
        tokensUsed,
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Log device management action
   */
  async logDeviceAdded(userId: string, deviceId: string, deviceName: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'DEVICE_ADDED',
      deviceId,
      metadata: { deviceName, timestamp: new Date().toISOString() },
    })
  }

  /**
   * Log device removal
   */
  async logDeviceRemoved(userId: string, deviceId: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'DEVICE_REMOVED',
      deviceId,
      metadata: { timestamp: new Date().toISOString() },
    })
  }

  /**
   * Log subscription change
   */
  async logSubscriptionChange(userId: string, newTier: string, previousTier: string): Promise<void> {
    await this.logAudit({
      userId,
      action: 'SUBSCRIPTION_CHANGE',
      metadata: {
        newTier,
        previousTier,
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Get activity summary for user (for dashboards)
   */
  async getActivitySummary(userId: string, days = 7): Promise<Record<AuditAction, number>> {
    try {
      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const logs = await this.prisma.auditLog.findMany({
        where: {
          userId,
          createdAt: { gte: sinceDate },
        },
      })

      const summary: Record<string, number> = {}

      for (const log of logs) {
        summary[log.action] = (summary[log.action] || 0) + 1
      }

      return summary as Record<AuditAction, number>
    } catch (error) {
      logger.error('Error getting activity summary:', error)
      return {} as Record<AuditAction, number>
    }
  }

  /**
   * Archive old audit logs (background job)
   * Keeps last 90 days, removes older logs
   */
  async archiveOldLogs(retentionDays = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      })

      logger.info(`Archived ${result.count} old audit logs (older than ${retentionDays} days)`)
      return result.count
    } catch (error) {
      logger.error('Error archiving old audit logs:', error)
      return 0
    }
  }
}

export default AuditLogService
