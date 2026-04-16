import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  async getNotifications(userId: string, page: number, limit: number, unread?: boolean) {
    const skip = (page - 1) * limit
    const where: any = { userId }
    if (unread) where.isRead = false

    const [notifications, unreadCount, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.count({ where }),
    ])

    return { notifications, unreadCount, total, page, limit }
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification || notification.userId !== userId) {
      throw new AppError('Notification not found', 404)
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification || notification.userId !== userId) {
      throw new AppError('Notification not found', 404)
    }

    return this.prisma.notification.delete({
      where: { id: notificationId },
    })
  }

  async getNotificationSettings(userId: string) {
    let settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    })

    if (!settings) {
      settings = await this.prisma.notificationSettings.create({
        data: { userId },
      })
    }

    return settings
  }

  async updateNotificationSettings(userId: string, updates: any) {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      create: { userId, ...updates },
      update: updates,
    })
  }

  async createNotification(userId: string, data: any) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data,
      },
    })
  }
}
