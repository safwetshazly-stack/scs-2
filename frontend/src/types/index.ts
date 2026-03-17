// ─── USER ────────────────────────────────────────────────
export type UserRole = 'USER' | 'INSTRUCTOR' | 'ADMIN'

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  emailVerified: boolean
  avatar?: string
  createdAt: string
  lastLogin?: string
}

export interface UserProfile {
  userId: string
  bio?: string
  avatar?: string
  coverImage?: string
  country?: string
  city?: string
  university?: string
  major?: string
  website?: string
  githubUrl?: string
  linkedinUrl?: string
  skills: string[]
}

export interface UserSettings {
  language: 'AR' | 'EN' | 'FR' | 'ES'
  theme: 'LIGHT' | 'DARK' | 'SYSTEM'
  emailNotifications: boolean
  pushNotifications: boolean
  showOnlineStatus: boolean
  allowMessages: boolean
}

export interface PublicUser {
  id: string
  username: string
  role: UserRole
  profile?: UserProfile
  isFollowing?: boolean
  _count?: {
    followers: number
    following: number
    coursesCreated: number
    enrollments: number
  }
}

// ─── AUTH ────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse extends AuthTokens {
  user: User
}

// ─── COMMUNITY ───────────────────────────────────────────
export type CommunityMemberRole = 'MEMBER' | 'MODERATOR' | 'ADMIN' | 'OWNER'
export type ChannelType = 'TEXT' | 'ANNOUNCEMENTS' | 'FILES'

export interface Community {
  id: string
  name: string
  slug: string
  description?: string
  avatar?: string
  coverImage?: string
  isPrivate: boolean
  isVerified: boolean
  membersCount: number
  ownerId: string
  createdAt: string
  isMember?: boolean
  memberRole?: CommunityMemberRole
  owner?: PublicUser
  _count?: { channels: number; members: number; posts: number }
}

export interface CommunityChannel {
  id: string
  communityId: string
  name: string
  description?: string
  type: ChannelType
  position: number
}

export interface ChannelMessage {
  id: string
  channelId: string
  senderId: string
  content: string
  type: string
  isPinned: boolean
  createdAt: string
  sender?: { id: string; username: string; profile?: { avatar?: string } }
  attachments?: Attachment[]
}

// ─── MESSAGING ───────────────────────────────────────────
export type ConversationType = 'PRIVATE' | 'GROUP'
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'AI_RESPONSE' | 'SYSTEM'

export interface Conversation {
  id: string
  type: ConversationType
  name?: string
  avatar?: string
  updatedAt: string
  members?: ConversationMember[]
  messages?: Message[]
  unreadCount?: number
}

export interface ConversationMember {
  conversationId: string
  userId: string
  isAdmin: boolean
  lastReadAt?: string
  user?: { id: string; username: string; profile?: { avatar?: string } }
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: MessageType
  replyToId?: string
  editedAt?: string
  deletedAt?: string
  createdAt: string
  sender?: { id: string; username: string; profile?: { avatar?: string } }
  replyTo?: { id: string; content: string; sender?: { username: string } }
  reactions?: MessageReaction[]
  attachments?: Attachment[]
  reads?: { userId: string }[]
}

export interface MessageReaction {
  messageId: string
  userId: string
  emoji: string
  user?: { id: string; username: string }
}

export interface Attachment {
  id: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
}

// ─── COURSE ──────────────────────────────────────────────
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED'

export interface Course {
  id: string
  title: string
  slug: string
  description: string
  thumbnail?: string
  previewVideo?: string
  price: number
  currency: string
  level: CourseLevel
  status: CourseStatus
  language: string
  tags: string[]
  instructorId: string
  totalDuration: number
  studentsCount: number
  rating: number
  reviewsCount: number
  isFeatured: boolean
  createdAt: string
  instructor?: PublicUser
  modules?: CourseModule[]
  reviews?: CourseReview[]
  isEnrolled?: boolean
  progress?: number
  _count?: { enrollments: number; reviews: number }
}

export interface CourseModule {
  id: string
  courseId: string
  title: string
  description?: string
  position: number
  lessons?: CourseLesson[]
}

export interface CourseLesson {
  id: string
  moduleId: string
  title: string
  description?: string
  videoUrl?: string
  duration: number
  position: number
  isFree: boolean
  resources: string[]
}

export interface CourseReview {
  id: string
  courseId: string
  userId: string
  rating: number
  content?: string
  createdAt: string
  user?: { id: string; username: string; profile?: { avatar?: string } }
}

// ─── BOOK ────────────────────────────────────────────────
export interface Book {
  id: string
  title: string
  slug: string
  description: string
  coverImage?: string
  fileUrl: string
  price: number
  currency: string
  authorId: string
  language: string
  tags: string[]
  pages?: number
  rating: number
  reviewsCount: number
  salesCount: number
  isPublished: boolean
  createdAt: string
  author?: PublicUser
  isPurchased?: boolean
  _count?: { purchases: number }
}

// ─── AI ──────────────────────────────────────────────────
export type AiModel = 'GPT4' | 'CLAUDE' | 'DEEPSEEK' | 'AUTO'

export interface AiConversation {
  id: string
  userId: string
  title?: string
  model: AiModel
  isArchived: boolean
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
}

export interface AiMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  modelUsed?: AiModel
  tokensUsed: number
  createdAt: string
}

export interface AiUsage {
  tokensUsed: number
  requestCount: number
  limit: number
  plan: string
  resetAt: string
}

// ─── PAYMENT ─────────────────────────────────────────────
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'

export interface Payment {
  id: string
  userId: string
  amount: number
  currency: string
  status: PaymentStatus
  method: string
  stripeId?: string
  createdAt: string
  transactions?: Transaction[]
}

export interface Transaction {
  id: string
  paymentId: string
  description: string
  amount: number
  createdAt: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  price: number
  currency: string
  interval: string
  features: string[]
  aiTokensLimit: number
  isActive: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  planId: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAt?: string
  plan?: SubscriptionPlan
}

// ─── NOTIFICATION ────────────────────────────────────────
export type NotificationType = 'MESSAGE' | 'COMMUNITY' | 'COURSE' | 'PAYMENT' | 'SYSTEM' | 'AI' | 'FOLLOW'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: string
}

// ─── ADMIN ───────────────────────────────────────────────
export interface AdminStats {
  users: { total: number; today: number; online: number }
  courses: { total: number; published: number }
  communities: { total: number }
  messages: { total: number }
  revenue: { total: number }
  ai: { requestsToday: number }
}

// ─── COMMON ──────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  error: string
  code?: string
  status: number
}

export interface UploadResponse {
  url: string
  name?: string
  type?: string
  size?: number
}
