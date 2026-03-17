// Shared types between backend and frontend

export type UserRole = 'USER' | 'INSTRUCTOR' | 'ADMIN'
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
export type ConversationType = 'PRIVATE' | 'GROUP'
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'AI_RESPONSE' | 'SYSTEM'
export type CommunityMemberRole = 'MEMBER' | 'MODERATOR' | 'ADMIN' | 'OWNER'
export type ChannelType = 'TEXT' | 'ANNOUNCEMENTS' | 'FILES'
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
export type AiModel = 'GPT4' | 'CLAUDE' | 'DEEPSEEK' | 'AUTO'
export type Language = 'AR' | 'EN' | 'FR' | 'ES'
export type NotificationType = 'MESSAGE' | 'COMMUNITY' | 'COURSE' | 'PAYMENT' | 'SYSTEM' | 'AI' | 'FOLLOW'

export interface JwtPayload {
  userId: string
  role: UserRole
  iat: number
  exp: number
}

export interface SocketAuthPayload {
  token: string
}

export interface MessageSendPayload {
  conversationId: string
  content: string
  type?: MessageType
  replyToId?: string
}

export interface ChannelMessagePayload {
  channelId: string
  communityId: string
  content: string
}

export interface TypingPayload {
  conversationId: string
}

export interface ReactionPayload {
  messageId: string
  emoji: string
  conversationId: string
}
