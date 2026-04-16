/**
 * Chat Controller
 */

import { Request, Response, NextFunction } from 'express'
import { ChatService } from '../services/chat.service'

export class ChatController {
  constructor(private chatService: ChatService) {}

  async getOrCreateConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId1 = req.user?.id!
      const { userId2 } = req.body
      const conversation = await this.chatService.getOrCreateConversation(userId1, userId2)
      res.json(conversation)
    } catch (error) {
      next(error)
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params
      const senderId = req.user?.id!
      const { content } = req.body
      const message = await this.chatService.sendMessage(conversationId, senderId, content)
      res.status(201).json(message)
    } catch (error) {
      next(error)
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params
      const limit = parseInt(req.query.limit as string) || 50
      const offset = parseInt(req.query.offset as string) || 0
      const result = await this.chatService.getMessages(conversationId, limit, offset)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async getUserConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const result = await this.chatService.getUserConversations(userId, limit, offset)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params
      const userId = req.user?.id!
      await this.chatService.markAsRead(messageId, userId)
      res.json({ message: 'Marked as read' })
    } catch (error) {
      next(error)
    }
  }

  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!
      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0
      const unreadOnly = req.query.unreadOnly === 'true'
      const result = await this.chatService.getNotifications(userId, limit, offset, unreadOnly)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async markNotificationAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { notificationId } = req.params
      await this.chatService.markNotificationAsRead(notificationId)
      res.json({ message: 'Marked as read' })
    } catch (error) {
      next(error)
    }
  }
}
