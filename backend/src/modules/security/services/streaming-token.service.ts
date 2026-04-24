import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import crypto from 'crypto'

interface GenerateTokenInput {
  userId: string
  deviceId: string
  resourceId: string
  expirationMinutes?: number
}

interface ValidateTokenInput {
  token: string
  userId: string
  deviceId: string
  resourceId: string
}

export class StreamingTokenService {
  private readonly defaultExpirationMinutes = 5 // 5 minute default
  private readonly maxExpirationMinutes = 30

  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a short-lived streaming token
   * Token is bound to userId, deviceId, and resourceId
   */
  async generateStreamingToken(input: GenerateTokenInput): Promise<{
    token: string
    expiresAt: Date
    expiresIn: number
  }> {
    try {
      const expirationMinutes = Math.min(input.expirationMinutes || this.defaultExpirationMinutes, this.maxExpirationMinutes)
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000)

      // Check if device exists and belongs to user
      const device = await this.prisma.device.findUnique({
        where: { id: input.deviceId },
      })

      if (!device || device.userId !== input.userId) {
        throw new AppError('Device not found or does not belong to user', 404)
      }

      // Create streaming token
      const streamingToken = await this.prisma.streamingToken.create({
        data: {
          userId: input.userId,
          deviceId: input.deviceId,
          resourceId: input.resourceId,
          token,
          expiresAt,
        },
      })

      logger.info(`Streaming token generated for user: ${input.userId}, resource: ${input.resourceId}, device: ${input.deviceId}`)

      return {
        token,
        expiresAt,
        expiresIn: expirationMinutes * 60, // Return in seconds
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error generating streaming token:', error)
      throw new AppError('Failed to generate streaming token', 500)
    }
  }

  /**
   * Validate a streaming token
   * Checks expiration, validity, and device binding
   */
  async validateStreamingToken(input: ValidateTokenInput): Promise<boolean> {
    try {
      const streamingToken = await this.prisma.streamingToken.findUnique({
        where: { token: input.token },
      })

      if (!streamingToken) {
        logger.warn(`Invalid streaming token attempted for user: ${input.userId}`)
        return false
      }

      // Check expiration
      if (new Date() > streamingToken.expiresAt) {
        logger.info(`Expired streaming token for user: ${input.userId}`)
        return false
      }

      // Check if token is still valid
      if (!streamingToken.isValid) {
        logger.warn(`Invalid streaming token (disabled) for user: ${input.userId}`)
        return false
      }

      // Verify bindings
      if (
        streamingToken.userId !== input.userId ||
        streamingToken.deviceId !== input.deviceId ||
        streamingToken.resourceId !== input.resourceId
      ) {
        logger.warn(`Streaming token binding mismatch for user: ${input.userId}`)
        return false
      }

      return true
    } catch (error) {
      logger.error('Error validating streaming token:', error)
      return false
    }
  }

  /**
   * Revoke a streaming token
   */
  async revokeStreamingToken(token: string): Promise<void> {
    try {
      await this.prisma.streamingToken.update({
        where: { token },
        data: { isValid: false },
      })

      logger.info(`Streaming token revoked: ${token}`)
    } catch (error) {
      logger.error('Error revoking streaming token:', error)
    }
  }

  /**
   * Revoke all streaming tokens for a device
   */
  async revokeDeviceTokens(deviceId: string): Promise<void> {
    try {
      await this.prisma.streamingToken.updateMany({
        where: { deviceId },
        data: { isValid: false },
      })

      logger.info(`All streaming tokens revoked for device: ${deviceId}`)
    } catch (error) {
      logger.error('Error revoking device tokens:', error)
    }
  }

  /**
   * Clean up expired tokens (background job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.streamingToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      })

      logger.info(`Cleaned up ${result.count} expired streaming tokens`)
      return result.count
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error)
      return 0
    }
  }

  /**
   * Count active streaming tokens for resource
   * Used for detecting concurrent streaming
   */
  async countActiveStreamsByResource(resourceId: string): Promise<number> {
    try {
      return await this.prisma.streamingToken.count({
        where: {
          resourceId,
          isValid: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      })
    } catch (error) {
      logger.error('Error counting active streams:', error)
      return 0
    }
  }

  /**
   * Count active streaming tokens for user across all devices
   */
  async countActiveStreamsByUser(userId: string): Promise<number> {
    try {
      return await this.prisma.streamingToken.count({
        where: {
          userId,
          isValid: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      })
    } catch (error) {
      logger.error('Error counting user active streams:', error)
      return 0
    }
  }
}

export default StreamingTokenService
