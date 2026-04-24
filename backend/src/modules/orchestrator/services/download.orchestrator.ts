/**
 * Download Orchestrator
 * Coordinates secure download flow: ownership verification → token generation → URL retrieval
 * Enforces one-time usage and token expiry
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { LibraryService } from '../../course/services/library.service'
import { DownloadService, DownloadResourceType } from '../../course/services/download.service'
import { StorageService } from '../../upload/services/storage.service'

export class DownloadOrchestrator {
  constructor(
    private prisma: PrismaClient,
    private libraryService: LibraryService,
    private downloadService: DownloadService,
    private storageService: StorageService
  ) {}

  /**
   * Request Download
   * 1. Verify user owns/has access to resource
   * 2. Generate secure token
   * 3. Get secure signed URL from storage
   * 4. Return download info
   */
  async requestDownload(userId: string, resourceType: DownloadResourceType, resourceId: string) {
    // 1. Verify ownership/access
    await this.verifyResourceAccess(userId, resourceType, resourceId)

    // 2. Generate download token
    const tokenData = await this.downloadService.generateDownloadToken(userId, resourceType, resourceId)

    // 3. Get secure URL from storage
    // Resource path format: {type}/{resourceId}
    const resourcePath = `${resourceType.toLowerCase()}/${resourceId}`
    const secureUrl = await this.storageService.getSignedUrl(resourcePath, 86400) // 24 hours

    logger.info(`Download requested: ${userId} - ${resourceType}/${resourceId} - Token: ${tokenData.token}`)

    return {
      success: true,
      token: tokenData.token,
      downloadUrl: secureUrl,
      expiresAt: tokenData.expiresAt,
      resourceType,
      resourceId,
    }
  }

  /**
   * Consume Download Token
   * 1. Validate token
   * 2. Check token not already used
   * 3. Verify ownership
   * 4. Mark token as used
   * 5. Log download
   * 6. Return secure URL for actual download
   */
  async consumeDownloadToken(token: string, userIp?: string) {
    // 1. Validate token format and signature
    const tokenData = await this.downloadService.validateDownloadToken(token)

    if (!tokenData) {
      throw new AppError('Invalid or expired download token', 401)
    }

    // 2. Check token not already used
    const downloadRecord = await this.prisma.downloadToken.findUnique({
      where: { token },
    })

    if (!downloadRecord) {
      throw new AppError('Download token not found', 404)
    }

    if (downloadRecord.isUsed) {
      throw new AppError('Download token already used (one-time only)', 403)
    }

    if (downloadRecord.expiresAt < new Date()) {
      throw new AppError('Download token expired', 401)
    }

    // 3. Verify ownership (re-verify)
    await this.verifyResourceAccess(
      downloadRecord.userId,
      downloadRecord.resourceType as DownloadResourceType,
      downloadRecord.resourceId
    )

    // 4. Mark token as used (atomic)
    await this.downloadService.markTokenUsed(token)

    // 5. Log download
    await this.downloadService.logDownload(
      downloadRecord.userId,
      downloadRecord.resourceType as DownloadResourceType,
      downloadRecord.resourceId,
      userIp
    )

    // 6. Get fresh signed URL for download
    const resourcePath = `${downloadRecord.resourceType.toLowerCase()}/${downloadRecord.resourceId}`
    const downloadUrl = await this.storageService.getSignedUrl(resourcePath, 3600) // 1 hour for download

    logger.info(`Download token consumed: ${downloadRecord.userId} - ${downloadRecord.resourceType}/${downloadRecord.resourceId}`)

    return {
      success: true,
      downloadUrl,
      resourceType: downloadRecord.resourceType,
      resourceId: downloadRecord.resourceId,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    }
  }

  /**
   * Get Download History
   * Returns list of downloaded resources by user
   */
  async getDownloadHistory(userId: string, limit = 50, offset = 0) {
    const history = await this.downloadService.getDownloadHistory(userId, limit, offset)
    return history
  }

  /**
   * Verify user has access to resource
   * Checks library ownership or appropriate purchase records
   */
  private async verifyResourceAccess(
    userId: string,
    resourceType: DownloadResourceType,
    resourceId: string
  ): Promise<void> {
    if (resourceType === 'COURSE') {
      // Check if enrolled in course
      const enrollment = await this.prisma.courseEnrollment.findFirst({
        where: { userId, courseId: resourceId },
      })

      if (!enrollment) {
        throw new AppError('Not enrolled in this course. Cannot download.', 403)
      }
    } else if (resourceType === 'BOOK') {
      // Check if purchased book
      const purchase = await this.prisma.bookPurchase.findFirst({
        where: { userId, bookId: resourceId },
      })

      if (!purchase) {
        throw new AppError('Book not purchased. Cannot download.', 403)
      }
    } else if (resourceType === 'VIDEO') {
      // Check if has access to course with this video
      const video = await this.prisma.video.findUnique({
        where: { id: resourceId },
      })

      if (!video) {
        throw new AppError('Video not found', 404)
      }

      const lesson = await this.prisma.courseLesson.findUnique({
        where: { id: video.lessonId },
      })

      if (!lesson) {
        throw new AppError('Lesson not found', 404)
      }

      // Get course through module
      const module = await this.prisma.courseModule.findUnique({
        where: { id: lesson.moduleId },
      })

      if (!module) {
        throw new AppError('Module not found', 404)
      }

      const enrollment = await this.prisma.courseEnrollment.findFirst({
        where: { userId, courseId: module.courseId },
      })

      if (!enrollment) {
        throw new AppError('Not enrolled in this course. Cannot access videos.', 403)
      }
    } else {
      throw new AppError('Invalid resource type', 400)
    }
  }

  /**
   * Check download eligibility
   * Returns whether user can download a resource
   */
  async getDownloadEligibility(
    userId: string,
    resourceType: DownloadResourceType,
    resourceId: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      await this.verifyResourceAccess(userId, resourceType, resourceId)
      return { eligible: true }
    } catch (error) {
      if (error instanceof AppError) {
        return { eligible: false, reason: error.message }
      }
      return { eligible: false, reason: 'Unknown error' }
    }
  }

  /**
   * Cleanup expired tokens
   * Should be run periodically (e.g., daily via cron job)
   */
  async cleanupExpiredTokens() {
    await this.downloadService.cleanupExpiredTokens()
    logger.info(`Cleanup: Expired download tokens removed`)
  }
}
