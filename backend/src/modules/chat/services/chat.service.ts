/**
 * Chat Service
 * Handles real-time chat, messages, and notifications
 */

import { PrismaClient, ConversationType, MessageType } from '@prisma/client'
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
        AND: [{ members: { some: { userId: participant1 } } }, { members: { some: { userId: participant2 } } }],
      },
    })

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          type: ConversationType.PRIVATE,
          members: {
            create: [{ userId: participant1 }, { userId: participant2 }],
          },
        },
      })

      logger.info(`Conversation created: ${participant1} <-> ${participant2}`)
    }

    return conversation
  }

  /**
   * Send message with mention parsing and AI trigger support
   */
  async sendMessage(conversationId: string, senderId: string, content: string, type: MessageType = MessageType.TEXT) {
    // Verify user is in conversation
    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: senderId },
    })

    if (!member) {
      throw new AppError('Not a member in this conversation', 403)
    }

    // Parse mentions
    const mentions = this.parseMentions(content)
    const aiMentioned = this.isAiMentioned(content)

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        type,
      },
    })

    // Handle mentions - send notifications
    if (mentions.length > 0) {
      for (const userId of mentions) {
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'MESSAGE',
            title: 'You were mentioned',
            body: `${await this.getUsernameById(senderId)} mentioned you`,
          },
        })
      }
    }

    // Handle AI mention
    if (aiMentioned && type === MessageType.TEXT) {
      // Create AI response trigger
      logger.info(`AI mentioned in message: ${message.id}`)
    }

    // Update conversation updatedAt for sorting
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    logger.info(`Message sent: ${message.id}`)
    return message
  }

  /**
   * Parse @mentions from message content
   */
  private parseMentions(content: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g
    const mentions: string[] = []

    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1]
      if (username.toLowerCase() !== 'ai') {
        mentions.push(username)
      }
    }

    return [...new Set(mentions)]
  }

  /**
   * Check if @ai is mentioned
   */
  private isAiMentioned(content: string): boolean {
    return /@ai\b/i.test(content)
  }

  /**
   * Get username by ID (helper)
   */
  private async getUsernameById(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    })
    return user?.username || 'User'
  }

  /**
   * Send message with type
   */
  async sendTypedMessage(conversationId: string, senderId: string, content: string, type: MessageType = MessageType.TEXT) {
    return this.sendMessage(conversationId, senderId, content, type)
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
      this.prisma.conversationMember.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
                },
              },
              messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { sender: { select: { username: true } } } },
            },
          },
        },
        orderBy: { conversation: { updatedAt: 'desc' } },
        take: limit,
        skip: offset,
      }),
      this.prisma.conversationMember.count({ where: { userId } }),
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
    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId: message.conversationId, userId },
    })

    if (!member) {
      throw new AppError('Not a member', 403)
    }

    await this.prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { readAt: new Date() },
    })

    return true
  }

  /**
   * Create group conversation
   */
  async createGroupConversation(creatorId: string, data: { name: string; memberIds: string[]; avatar?: string }) {
    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        name: data.name,
        avatar: data.avatar,
        members: {
          create: [
            { userId: creatorId, isAdmin: true },
            ...data.memberIds.map((id) => ({ userId: id, isAdmin: false })),
          ],
        },
      },
      include: { members: true },
    })

    logger.info(`Group conversation created: ${conversation.id} by ${creatorId}`)
    return conversation
  }

  /**
   * Add member to group conversation
   */
  async addMember(conversationId: string, userId: string, addedBy: string) {
    const adder = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: addedBy, isAdmin: true },
    })
    if (!adder) throw new AppError('Only admins can add members', 403)

    return this.prisma.conversationMember.create({
      data: { conversationId, userId, isAdmin: false },
    })
  }

  /**
   * Remove member from group conversation
   */
  async removeMember(conversationId: string, userId: string, removedBy: string) {
    const remover = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: removedBy, isAdmin: true },
    })
    if (!remover) throw new AppError('Only admins can remove members', 403)

    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId },
    })
    if (!member) throw new AppError('Member not found', 404)

    await this.prisma.conversationMember.delete({ where: { id: member.id } })
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      create: { messageId, userId, emoji },
      update: {},
    })
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } })
    if (!message) throw new AppError('Message not found', 404)
    if (message.senderId !== userId) throw new AppError('Not authorized', 403)

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    })
  }
}
