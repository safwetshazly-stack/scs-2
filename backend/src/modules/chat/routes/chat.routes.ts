/**
 * Chat Routes
 */

import { Router } from 'express'
import { body } from 'express-validator'
import { PrismaClient } from '@prisma/client'

import { ChatController } from '../controllers/chat.controller'
import { ChatService } from '../services/chat.service'
import { authenticate } from '../../../shared/middlewares/auth.middleware'
import { validate } from '../../../middlewares/validate.middleware'

export function createChatRoutes(prisma: PrismaClient): Router {
  const router = Router()

  const chatService = new ChatService(prisma)
  const chatController = new ChatController(chatService)

  router.post('/conversations', authenticate, (req, res, next) => chatController.getOrCreateConversation(req, res, next))
  router.get('/conversations', authenticate, (req, res, next) => chatController.getUserConversations(req, res, next))

  router.post('/conversations/:conversationId/messages', authenticate, body('content').notEmpty(), validate, (req, res, next) => chatController.sendMessage(req, res, next))
  router.get('/conversations/:conversationId/messages', authenticate, (req, res, next) => chatController.getMessages(req, res, next))

  router.put('/messages/:messageId/read', authenticate, (req, res, next) => chatController.markAsRead(req, res, next))

  return router
}
