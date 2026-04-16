/**
 * AI Module
 *
 * Public API for AI features
 *
 * Responsibilities:
 * - AI conversations
 * - Multiple LLM support (OpenAI, Anthropic, DeepSeek)
 * - Token usage tracking
 * - Usage limits enforcement
 *
 * Dependencies:
 * - Auth Module (for authentication)
 * - Payment Module (listens for subscription events to reset usage)
 *
 * Events emitted:
 * - ai:message-sent
 * - ai:usage-limit-reached
 *
 * Listens to:
 * - subscription:created (from Payment module) → reset usage limits
 */

export { AiService } from './services/ai.service'
export { AiController } from './controllers/ai.controller'
export { createAiRoutes } from './routes/ai.routes'
export type { AiConversation, AiMessage } from './types'
export { AiService } from './services/ai.service'
export { AiController } from './controllers/ai.controller'
export { AiEvent } from './events/ai.events'
