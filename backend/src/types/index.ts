export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | string

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: string
      }
    }
  }
}

export interface PaginationQuery {
  page?: string
  limit?: string
}

export interface SearchQuery extends PaginationQuery {
  search?: string
  sort?: string
}

export interface JwtPayload {
  userId: string
  role: UserRole
  iat: number
  exp: number
  iss: string
  aud: string
}

export interface FileUploadResult {
  url: string
  key: string
  size: number
  mimeType: string
}

export interface AiRequestPayload {
  userId: string
  conversationId: string
  message: string
  taskType?: 'chat' | 'code' | 'analysis' | 'translation' | 'summary' | 'creative'
  preferredModel?: 'GPT4' | 'CLAUDE' | 'DEEPSEEK' | 'AUTO'
  attachments?: string[]
}
