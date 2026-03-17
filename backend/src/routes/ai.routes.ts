import { Router } from 'express'
import { body, param } from 'express-validator'
import { validate } from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'
import {
  getConversations, createConversation, getMessages,
  sendMessage, deleteConversation, getUsage, streamMessage,
} from '../controllers/ai.controller'

export const aiRoutes = Router()

aiRoutes.use(authenticate)

aiRoutes.get('/conversations', getConversations)
aiRoutes.post('/conversations', [
  body('title').optional().isLength({ max: 100 }),
], validate, createConversation)
aiRoutes.get('/conversations/:id/messages', param('id').notEmpty(), validate, getMessages)
aiRoutes.post('/conversations/:id/messages', [
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 10000 }),
  body('taskType').optional().isIn(['chat', 'code', 'analysis', 'translation', 'summary', 'creative']),
  body('preferredModel').optional().isIn(['GPT4', 'CLAUDE', 'DEEPSEEK', 'AUTO']),
], validate, sendMessage)
aiRoutes.post('/conversations/:id/stream', [
  body('message').trim().notEmpty().isLength({ max: 10000 }),
], validate, streamMessage)
aiRoutes.delete('/conversations/:id', authenticate, deleteConversation)
aiRoutes.get('/usage', getUsage)
