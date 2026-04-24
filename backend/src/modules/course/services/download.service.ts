import { PrismaClient, DownloadResourceType } from '@prisma/client'
import { randomBytes } from 'crypto'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export { DownloadResourceType }

export class DownloadService {
  constructor(private prisma: PrismaClient) {}

  async generateDownloadToken(userId: string, resourceType: DownloadResourceType, resourceId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Verify access to resource
    if (resourceType === DownloadResourceType.COURSE) {
      const enrollment = await this.prisma.courseEnrollment.findFirst({
        where: { userId, courseId: resourceId },
      })
      if (!enrollment) {
        throw new AppError('Not enrolled in this course', 403)
      }
    } else if (resourceType === DownloadResourceType.BOOK) {
      const purchase = await this.prisma.bookPurchase.findFirst({
        where: { userId, bookId: resourceId },
      })
      if (!purchase) {
        throw new AppError('Book not purchased', 403)
      }
    }

    // Generate token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await this.prisma.downloadToken.create({
      data: {
        userId,
        resourceType,
        resourceId,
        token,
        expiresAt,
      },
    })

    logger.info(`Download token generated: ${userId} - ${resourceType}/${resourceId}`)

    return { token, expiresAt }
  }

  async validateDownloadToken(token: string) {
    const downloadToken = await this.prisma.downloadToken.findUnique({
      where: { token },
    })

    if (!downloadToken) {
      throw new AppError('Invalid token', 404)
    }

    if (downloadToken.isUsed) {
      throw new AppError('Token already used', 410)
    }

    if (downloadToken.expiresAt < new Date()) {
      throw new AppError('Token expired', 410)
    }

    return downloadToken
  }

  async logDownload(userId: string, resourceType: DownloadResourceType, resourceId: string, ipAddress?: string) {
    await this.prisma.downloadLog.create({
      data: {
        userId,
        resourceType,
        resourceId,
        ipAddress,
      },
    })

    logger.info(`Download logged: ${userId} - ${resourceType}/${resourceId} from ${ipAddress}`)
  }

  async markTokenUsed(token: string) {
    await this.prisma.downloadToken.update({
      where: { token },
      data: { isUsed: true },
    })
  }

  async getDownloadHistory(userId: string, limit = 50, offset = 0) {
    const [logs, total] = await Promise.all([
      this.prisma.downloadLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.downloadLog.count({ where: { userId } }),
    ])

    return { logs, total }
  }

  async cleanupExpiredTokens() {
    const result = await this.prisma.downloadToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        isUsed: false,
      },
    })

    logger.info(`Cleaned up ${result.count} expired download tokens`)
    return result.count
  }
}
