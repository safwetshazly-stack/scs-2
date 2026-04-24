import { PrismaClient, SecurityAlertType } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

interface LogSecurityAlertInput {
  userId: string
  alertType: SecurityAlertType
  ipAddress?: string
  deviceId?: string
  metadata?: Record<string, any>
  riskScore?: number
}

interface SecurityAnalysis {
  multipleIps: boolean
  concurrentStreams: number
  rapidActivity: boolean
  suspiciousPatterns: boolean
  overallRiskScore: number
}

export class SecurityLogService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log a security alert
   */
  async logSecurityAlert(input: LogSecurityAlertInput): Promise<any> {
    try {
      const alertLog = await this.prisma.securityLog.create({
        data: {
          userId: input.userId,
          alertType: input.alertType,
          ipAddress: input.ipAddress,
          deviceId: input.deviceId,
          metadata: input.metadata || {},
          riskScore: input.riskScore || 0,
        },
      })

      logger.warn(`Security alert logged: ${input.alertType} for user: ${input.userId}`)

      // If risk score is high, trigger additional checks
      if ((input.riskScore || 0) > 70) {
        await this.escalateAlert(input.userId, alertLog.id)
      }

      return alertLog
    } catch (error) {
      logger.error('Error logging security alert:', error)
      throw new AppError('Failed to log security alert', 500)
    }
  }

  /**
   * Escalate high-risk alerts (could trigger account lockdown, notifications, etc.)
   */
  private async escalateAlert(userId: string, alertId: string): Promise<void> {
    try {
      logger.error(`HIGH RISK ALERT ESCALATED - User: ${userId}, Alert: ${alertId}`)
      // In production: Send email to user, notify admins, etc.
      // For now, just log it
    } catch (error) {
      logger.error('Error escalating alert:', error)
    }
  }

  /**
   * Detect suspicious login patterns
   * Returns true if login is suspicious
   */
  async detectSuspiciousLogin(userId: string, currentIp: string, deviceId: string): Promise<{
    isSuspicious: boolean
    alertType?: SecurityAlertType
    reason?: string
    riskScore: number
  }> {
    try {
      const recentLogs = await this.prisma.securityLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      let riskScore = 0
      const alerts: string[] = []

      // Check for multiple IPs in short time
      const uniqueIps = new Set(recentLogs.map((log) => log.ipAddress).filter(Boolean))
      if (uniqueIps.size > 5) {
        riskScore += 30
        alerts.push('multiple_ips')
      }

      // Check for impossible travel (same IP but very recently from different location)
      const lastLogin = recentLogs[0]
      if (lastLogin && lastLogin.ipAddress && lastLogin.ipAddress !== currentIp) {
        const timeDiff = Date.now() - lastLogin.createdAt.getTime()
        if (timeDiff < 5 * 60 * 1000) {
          // Less than 5 minutes
          riskScore += 50
          alerts.push('impossible_travel')
        }
      }

      // Check for new country/region (simplified - just check IP is new)
      const hasSeenIp = recentLogs.some((log) => log.ipAddress === currentIp)
      if (!hasSeenIp) {
        riskScore += 20
        alerts.push('new_ip')
      }

      // Check for repeated failed attempts
      const failedAttempts = recentLogs.filter((log) => log.alertType === 'SUSPICIOUS_LOGIN').length
      if (failedAttempts > 3) {
        riskScore += 40
        alerts.push('repeated_failures')
      }

      const isSuspicious = riskScore > 40

      if (isSuspicious) {
        await this.logSecurityAlert({
          userId,
          alertType: 'SUSPICIOUS_LOGIN',
          ipAddress: currentIp,
          deviceId,
          metadata: { reasons: alerts },
          riskScore,
        })
      }

      return {
        isSuspicious,
        alertType: 'SUSPICIOUS_LOGIN',
        reason: alerts.join(', '),
        riskScore,
      }
    } catch (error) {
      logger.error('Error detecting suspicious login:', error)
      return { isSuspicious: false, riskScore: 0 }
    }
  }

  /**
   * Analyze user security profile
   */
  async analyzeUserSecurity(userId: string): Promise<SecurityAnalysis> {
    try {
      const now = Date.now()
      const oneDayAgo = now - 24 * 60 * 60 * 1000
      const oneHourAgo = now - 60 * 60 * 1000

      // Get recent activity
      const recentLogs = await this.prisma.securityLog.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(oneDayAgo) },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Get concurrent streams
      const concurrentStreams = await this.prisma.streamingToken.count({
        where: {
          userId,
          isValid: true,
          expiresAt: { gt: new Date() },
        },
      })

      // Check for multiple IPs
      const recentIps = await this.prisma.auditLog.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(oneHourAgo) },
        },
        select: { ipAddress: true },
        distinct: ['ipAddress'],
      })

      const multipleIps = recentIps.filter((log) => log.ipAddress).length > 2

      // Check for rapid activity
      const rapidActivityCount = recentLogs.filter((log) => log.createdAt.getTime() > oneHourAgo).length
      const rapidActivity = rapidActivityCount > 10

      // Check for suspicious patterns
      const suspiciousPatterns = recentLogs.some(
        (log) =>
          log.alertType === 'IMPOSSIBLE_TRAVEL' ||
          log.alertType === 'CONCURRENT_STREAMS' ||
          log.alertType === 'RAPID_DOWNLOADS'
      )

      // Calculate overall risk score
      let overallRiskScore = 0
      if (multipleIps) overallRiskScore += 20
      if (concurrentStreams > 3) overallRiskScore += 30
      if (rapidActivity) overallRiskScore += 25
      if (suspiciousPatterns) overallRiskScore += 25

      return {
        multipleIps,
        concurrentStreams,
        rapidActivity,
        suspiciousPatterns,
        overallRiskScore: Math.min(100, overallRiskScore),
      }
    } catch (error) {
      logger.error('Error analyzing user security:', error)
      return {
        multipleIps: false,
        concurrentStreams: 0,
        rapidActivity: false,
        suspiciousPatterns: false,
        overallRiskScore: 0,
      }
    }
  }

  /**
   * Get user's security alerts
   */
  async getUserSecurityAlerts(userId: string, limit = 50): Promise<any[]> {
    try {
      return await this.prisma.securityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    } catch (error) {
      logger.error('Error fetching security alerts:', error)
      throw new AppError('Failed to fetch security alerts', 500)
    }
  }

  /**
   * Mark security alert as resolved
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      await this.prisma.securityLog.update({
        where: { id: alertId },
        data: { isResolved: true },
      })

      logger.info(`Security alert resolved: ${alertId}`)
    } catch (error) {
      logger.error('Error resolving security alert:', error)
      throw new AppError('Failed to resolve alert', 500)
    }
  }
}

export default SecurityLogService
