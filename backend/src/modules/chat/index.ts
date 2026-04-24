/**
 * Chat Module
 *
 * Public API for messaging and conversations
 *
 * Responsibilities:
 * - Direct messages
 * - Conversations
 * - Message history
 * - Typing indicators
 *
 * Dependencies:
 * - Auth Module (for authentication)
 * - User Module (for user info)
 *
 * Uses:
 * - Socket.IO for real-time features
 * - Redis for message queuing
 */

export { ChatService } from './services/chat.service'
export { ChatController } from './controllers/chat.controller'
export { createChatRoutes } from './routes/chat.routes'
