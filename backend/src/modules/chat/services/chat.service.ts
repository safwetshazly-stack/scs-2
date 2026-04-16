/**
 * Chat Service
 * Handles real-time chat, messages, and notifications
 */

import { PrismaClient } from '@prisma/client'
import { AppError } from '../../../utils/errors'
import { logger } from '../../../utils/logger'

export class ChatService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get or create direct message conversation
   */
  async getOrCreateConversation(userId1: string, userId2: string) {
    // Ensure consistent ordering
    const [participant1, participant2] = [userId1, userId2].sort()

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [{ participants: { some: { userId: participant1 } } }, { participants: { some: { userId: participant2 } } }],
      },
    })

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          type: 'DIRECT',
          participants: {
            create: [{ userId: participant1 }, { userId: participant2 }],
          },
        },
      })

      logger.info(`Conversation created: ${participant1} <-> ${participant2}`)
    }

    return conversation
  }

  /**
   * Send message
   */
  async sendMessage(conversationId: string, senderId: string, content: string) {
    // Verify user is in conversation
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: senderId },
    })

    if (!participant) {
      throw new AppError('Not a participant in this conversation', 403)
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
    })

    // Update conversation's last message
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    logger.info(`Message sent: ${message.id}`)
    return message
  }

  /**
   * Get conversation messages
   */
  async getMessages(conversationId: string, limit = 50, offset = 0) {
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ])

    return { messages: messages.reverse(), total }
  }

  /**
   * Get user conversations
   */
  async getUserConversations(userId: string, limit = 20, offset = 0) {
    const [conversations, total] = await Promise.all([
      this.prisma.conversationParticipant.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              participants: {
                include: {
                  user: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
                },
              },
              lastMessage: {
                include: {
                  sender: { select: { username: true } },
                },
              },
            },
          },
        },
        orderBy: { conversation: { lastMessageAt: 'desc' } },
        take: limit,
        skip: offset,
      }),
      this.prisma.conversationParticipant.count({ where: { userId } }),
    ])

    return {
      conversations: conversations.map((c) => c.conversation),
      total,
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    })

    if (!message) {
      throw new AppError('Message not found', 404)
    }

    // Verify user is in conversation
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId: message.conversationId, userId },
    })

    if (!participant) {
      throw new AppError('Not a participant', 403)
    }

    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { readAt: new Date() },
    })

    return true
  }

  /**
   * Send notification
   */
  async sendNotification(userId: string, type: string, title: string, body: string, data?: any) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data || {},
      },
    })

    logger.info(`Notification sent: ${notification.id} to ${userId}`)
    return notification
  }

  /**
   * Get notifications
   */
  async getNotifications(userId: string, limit = 20, offset = 0, unreadOnly = false) {
    const where: any = { userId }
    if (unreadOnly) {
      where.readAt = null
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ])

    return { notifications, total }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string) {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    })
  }
}
