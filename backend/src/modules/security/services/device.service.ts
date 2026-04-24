import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'
import { SubscriptionTier } from '@prisma/client'

interface CreateDeviceInput {
  userId: string
  deviceFingerprint: string
  deviceName: string
  ipAddress: string
  userAgent?: string
}

interface DeviceLimits {
  [key in SubscriptionTier]: number
}

export class DeviceService {
  private readonly deviceLimits: DeviceLimits = {
    FREE: 2, // Free tier: max 2 devices
    SILVER: 5, // Silver tier: max 5 devices
    GOLD: 10, // Gold tier: max 10 devices
  }

  constructor(private prisma: PrismaClient) {}

  /**
   * Register or update a device for a user
   * Enforces max devices limit based on subscription tier
   */
  async registerDevice(input: CreateDeviceInput, subscriptionTier: SubscriptionTier = 'FREE'): Promise<any> {
    try {
      // Check if device already exists
      const existingDevice = await this.prisma.device.findUnique({
        where: { deviceFingerprint: input.deviceFingerprint },
      })

      if (existingDevice) {
        // Update last active time
        return await this.prisma.device.update({
          where: { id: existingDevice.id },
          data: { lastActiveAt: new Date() },
        })
      }

      // Get user's current device count
      const deviceCount = await this.prisma.device.count({
        where: { userId: input.userId },
      })

      const maxDevices = this.deviceLimits[subscriptionTier]

      if (deviceCount >= maxDevices) {
        // Remove oldest untrusted device
        const oldestDevice = await this.prisma.device.findFirst({
          where: {
            userId: input.userId,
            isTrusted: false,
          },
          orderBy: { lastActiveAt: 'asc' },
        })

        if (oldestDevice) {
          logger.info(
            `Device limit reached. Removing oldest untrusted device: ${oldestDevice.id} for user: ${input.userId}`
          )
          await this.prisma.device.delete({
            where: { id: oldestDevice.id },
          })
        } else {
          // If all devices are trusted, reject the registration
          throw new AppError(
            `Device limit exceeded (${maxDevices}). Please remove a device or upgrade subscription.`,
            400
          )
        }
      }

      // Create new device
      const device = await this.prisma.device.create({
        data: {
          userId: input.userId,
          deviceFingerprint: input.deviceFingerprint,
          deviceName: input.deviceName,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          lastActiveAt: new Date(),
        },
      })

      logger.info(`Device registered: ${device.id} for user: ${input.userId}`)
      return device
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error registering device:', error)
      throw new AppError('Failed to register device', 500)
    }
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<any[]> {
    try {
      return await this.prisma.device.findMany({
        where: { userId },
        orderBy: { lastActiveAt: 'desc' },
      })
    } catch (error) {
      logger.error('Error fetching user devices:', error)
      throw new AppError('Failed to fetch devices', 500)
    }
  }

  /**
   * Trust a device (user explicitly marks it as trusted)
   */
  async trustDevice(userId: string, deviceId: string): Promise<any> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      })

      if (!device || device.userId !== userId) {
        throw new AppError('Device not found', 404)
      }

      return await this.prisma.device.update({
        where: { id: deviceId },
        data: { isTrusted: true },
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error trusting device:', error)
      throw new AppError('Failed to trust device', 500)
    }
  }

  /**
   * Remove a device
   */
  async removeDevice(userId: string, deviceId: string): Promise<void> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      })

      if (!device || device.userId !== userId) {
        throw new AppError('Device not found', 404)
      }

      // Delete all associated streaming tokens
      await this.prisma.streamingToken.deleteMany({
        where: { deviceId },
      })

      await this.prisma.device.delete({
        where: { id: deviceId },
      })

      logger.info(`Device removed: ${deviceId} for user: ${userId}`)
    } catch (error) {
      if (error instanceof AppError) throw error
      logger.error('Error removing device:', error)
      throw new AppError('Failed to remove device', 500)
    }
  }

  /**
   * Check if device is registered for user
   */
  async isDeviceRegistered(userId: string, deviceFingerprint: string): Promise<boolean> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { deviceFingerprint },
      })

      return device ? device.userId === userId : false
    } catch (error) {
      logger.error('Error checking device registration:', error)
      return false
    }
  }

  /**
   * Get device by fingerprint
   */
  async getDeviceByFingerprint(deviceFingerprint: string): Promise<any | null> {
    try {
      return await this.prisma.device.findUnique({
        where: { deviceFingerprint },
      })
    } catch (error) {
      logger.error('Error fetching device by fingerprint:', error)
      return null
    }
  }

  /**
   * Update device last active time
   */
  async updateLastActive(deviceId: string): Promise<void> {
    try {
      await this.prisma.device.update({
        where: { id: deviceId },
        data: { lastActiveAt: new Date() },
      })
    } catch (error) {
      logger.error('Error updating device last active:', error)
    }
  }
}

export default DeviceService
