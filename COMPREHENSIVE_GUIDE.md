# SCS Platform 2 - Comprehensive Developer Guide

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Design](#architecture--design)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [System Architecture Diagrams](#system-architecture-diagrams)
6. [How Everything Works](#how-everything-works)
7. [Known Issues & Solutions](#known-issues--solutions)
8. [AI Integration Guide](#ai-integration-guide)
9. [Performance Optimization](#performance-optimization)
10. [Security Implementation](#security-implementation)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**SCS Platform 2** is a comprehensive educational social platform that combines the best features of:
- **Udemy**: Course marketplace with structured learning
- **Discord**: Community channels and real-time communication
- **WhatsApp**: Direct messaging and group chats
- **ChatGPT**: AI-powered assistance and learning tools

### Key Features
- ✅ Course creation and enrollment
- ✅ Community forums and discussions
- ✅ Real-time chat and notifications
- ✅ AI-powered learning assistant
- ✅ Payment processing (Stripe)
- ✅ File storage (AWS S3)
- ✅ User authentication with JWT
- ✅ Admin dashboard
- ✅ Analytics and tracking

---

## 🏗️ Architecture & Design

### Architectural Patterns Used

1. **Layered Architecture** (Backend)
   - Controllers: Handle HTTP requests/responses
   - Services: Business logic and data processing
   - Models: Database schema using Prisma ORM

2. **Component-Based Architecture** (Frontend)
   - Reusable UI components
   - Custom hooks for logic sharing
   - Zustand for state management

3. **Real-time Communication**
   - Socket.io for instant notifications
   - Pub/Sub pattern for event distribution
   - Redis for session management

4. **Microservices Ready**
   - Decoupled services (AI, Search, Analytics)
   - API-first design
   - Easy to scale horizontally

---

## 🔧 Technology Stack

### Backend
```
Runtime: Node.js 20 LTS
Language: TypeScript 5.9
Framework: Express 4.18
Database: PostgreSQL 16
Cache: Redis 7
ORM: Prisma 5.8
Real-time: Socket.io 4.7
AI APIs: OpenAI, Anthropic, DeepSeek
Payment: Stripe
File Storage: AWS S3
```

### Frontend
```
Framework: Next.js 14.2 (React 18)
Language: TypeScript
Styling: Tailwind CSS 3.4
State Management: Zustand
Forms: React Hook Form
Data Fetching: TanStack Query
Animations: Framer Motion
Icons: Lucide React
```

### DevOps
```
Containerization: Docker
Orchestration: Docker Compose
Package Manager: npm
Task Runner: npm scripts
Version Control: Git
```

---

## 💻 Installation & Setup

### Prerequisites
- Docker & Docker Compose installed
- Git for version control
- Text editor or IDE (VS Code recommended)

### Quick Start (Development)

```bash
# 1. Clone the repository
git clone <repository-url>
cd "SCS 2"

# 2. Copy environment configuration
cp .env.example .env

# 3. Edit .env with your local settings
nano .env  # or use your preferred editor

# 4. Start all services
docker compose -f docker-compose.dev.yml up -d

# 5. Run database migrations and seed data
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed

# 6. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# Database: localhost:5432
# Redis: localhost:6379
```

### Available Commands

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f backend      # Backend logs
docker compose logs -f frontend     # Frontend logs

# Database operations
docker compose exec backend npx prisma studio        # Open Prisma Studio
docker compose exec backend npx prisma migrate dev   # Create migration
docker compose exec backend npm run prisma:seed      # Seed data

# Shell access
docker compose exec backend sh       # Backend container shell
docker compose exec frontend sh      # Frontend container shell
```

---

## 📊 System Architecture Diagrams

### 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)        │  Mobile App  │  Admin Dashboard        │
│  (http://localhost:     │  (Native)    │  (Admin Panel)          │
│   3000)                 │              │                         │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ REST APIs + WebSocket    │
               ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Express Server (http://localhost:4000)                          │
│  - Authentication Middleware (JWT)                              │
│  - CORS & Security Headers                                      │
│  - Rate Limiting                                                │
│  - Request Validation                                           │
│  - Error Handling                                               │
└──────────────┬──────────────┬──────────────┬─────────────────────┘
               │              │              │
         ┌─────▼─────┐   ┌───▼────┐    ┌────▼────┐
         │  Routes   │   │Services │    │Middleware
         │  Layer    │   │Layer    │    │Layer
         └─────┬─────┘   └───┬────┘    └────┬────┘
               │             │             │
┌──────────────▼──────────────▼─────────────▼──────────────────────┐
│                   BUSINESS LOGIC LAYER                           │
├──────────────────────────────────────────────────────────────────┤
│  • Course Management      • User Management                      │
│  • Payment Processing     • Community Forums                     │
│  • Chat Handling          • Search & Analytics                   │
│  • AI Integration         • Notifications                        │
│  • File Management        • Authentication                       │
└──────────────┬──────────────────────────────────┬────────────────┘
               │                                  │
┌──────────────▼──────────────────────────────────▼────────────────┐
│                      DATA LAYER                                  │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐       │
│  │ PostgreSQL  │  │  Redis   │  │ AWS S3 │  │External   │       │
│  │ (Main DB)   │  │ (Cache)  │  │(Files) │  │APIs       │       │
│  └─────────────┘  └──────────┘  └────────┘  └───────────┘       │
│                                                                   │
│  Stripe (Payments)  │  SendGrid (Email)  │  AI APIs (OpenAI...)  │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Database Schema (Simplified)

```
┌──────────────┐
│    Users     │
├──────────────┤
│ id (PK)      │
│ email        │
│ password     │
│ role         │
│ verified     │
│ createdAt    │
└──────┬───────┘
       │
       ├─→ ┌──────────────┐
       │   │   Courses    │
       │   ├──────────────┤
       │   │ id (PK)      │
       │   │ instructorId │
       │   │ title        │
       │   │ price        │
       │   │ published    │
       │   └──────┬───────┘
       │          │
       │          ├─→ ┌──────────────┐
       │          │   │  Enrollments │
       │          │   ├──────────────┤
       │          │   │ userId (FK)  │
       │          │   │ courseId (FK)│
       │          │   │ progress     │
       │          │   └──────────────┘
       │          │
       │          └─→ ┌──────────────┐
       │              │   Lessons    │
       │              ├──────────────┤
       │              │ courseId (FK)│
       │              │ title        │
       │              │ videoUrl     │
       │              └──────────────┘
       │
       ├─→ ┌──────────────┐
       │   │ Communities  │
       │   ├──────────────┤
       │   │ id (PK)      │
       │   │ name         │
       │   │ description  │
       │   │ creatorId    │
       │   └──────┬───────┘
       │          │
       │          └─→ ┌──────────────┐
       │              │   Messages   │
       │              ├──────────────┤
       │              │ senderId (FK)│
       │              │ content      │
       │              │ createdAt    │
       │              └──────────────┘
       │
       └─→ ┌──────────────┐
           │ Notifications│
           ├──────────────┤
           │ userId (FK)  │
           │ type         │
           │ read         │
           │ createdAt    │
           └──────────────┘
```

### 3. Request/Response Flow

```
1. USER REQUEST
   ↓
2. FRONTEND (Next.js)
   ├─ Validates input
   ├─ Shows loading state
   ↓
3. API CALL (HTTP/WebSocket)
   ├─ Sends with JWT token
   ↓
4. BACKEND (Express)
   ├─ Auth Middleware (JWT validation)
   ├─ Rate Limiter Check
   ├─ Request Validation
   ├─ Route Handler
   ↓
5. SERVICE LAYER
   ├─ Check cache (Redis)
   ├─ Execute business logic
   ├─ Query database (Prisma)
   ├─ Call external APIs if needed
   ↓
6. RESPONSE
   ├─ Format data
   ├─ Update cache
   ├─ Send response
   ↓
7. FRONTEND
   ├─ Update UI
   ├─ Show success/error
   ├─ Trigger notifications
```

---

## ⚙️ How Everything Works

### 1. User Authentication Flow

```
LOGIN PROCESS:
1. User enters email + password
2. Password hashed to SHA-256
3. Compared with stored hash in database
4. If match:
   - Generate JWT access token (15 minutes)
   - Generate JWT refresh token (30 days)
   - Store refresh token in Redis for blacklist check
   - Return tokens to client
5. Client stores tokens:
   - Access token: Memory/Session
   - Refresh token: HttpOnly cookie
6. Each API request includes: Authorization: Bearer {accessToken}

LOGOUT:
1. Remove access token from memory
2. Remove refresh token cookie
3. Add token to Redis blacklist
4. Expire after 30 days
```

### 2. Course Enrollment & Payment Flow

```
COURSE PURCHASE:
1. User clicks "Buy Course"
2. Frontend calls Create Payment Intent API
3. Backend creates Stripe payment intent
4. Frontend opens Stripe payment form
5. User enters card details
6. Stripe processes payment
7. Webhook received by backend
8. Backend creates enrollment record
9. User gains course access
10. Email confirmation sent

REFUND:
1. User requests refund
2. Admin approves in dashboard
3. Backend calls Stripe refund API
4. Enrollment record deleted
5. Email notification sent
```

### 3. Real-Time Chat Flow

```
MESSAGE FLOW:
1. User types message + clicks send
2. Frontend sends via Socket.io
3. Message added to database (optimistic update)
4. Backend broadcasts to all community members
5. Delivery notification sent
6. Read receipt when other user opens chat
7. Notification badge updated if offline

NOTIFICATIONS:
- Created when important event happens
- Stored in database for persistence
- Cached in Redis for performance
- Sent via WebSocket for real-time delivery
```

### 4. AI Integration Flow

```
AI CHAT REQUEST:
1. User sends message to AI
2. System selects AI provider (OpenAI/Claude/DeepSeek)
3. Format message with conversation history
4. Call AI API with rate limiting
5. Stream response back to user
6. Calculate token usage
7. Log interaction for analytics
8. Return final response

FALLBACK LOGIC:
- Try primary provider (OpenAI)
- If fails, try secondary (Claude)
- If fails, try tertiary (DeepSeek)
- If all fail, show error message
```

---

## 🚨 Known Issues & Solutions

### Critical Issues (FIXED)

#### 1. **Sparkles Icon Not Defined**
- **Problem**: `Sparkles` icon component was used but not imported
- **Solution**: Added to import statement in `frontend/src/components/sections/index.tsx`
- **Status**: ✅ FIXED

#### 2. **Credentials in Console Logs**
- **Problem**: Seed script logged admin credentials in plaintext
- **Solution**: Removed sensitive info from logs, kept in documentation only
- **Files**: `backend/prisma/seed.ts`
- **Status**: ✅ FIXED

#### 3. **Next.js Build Cache Issues**
- **Problem**: Build cache wasn't invalidating on source changes
- **Solution**: Clear `.next` and `node_modules/.cache` on rebuild
- **Docker Command**: `docker exec container rm -rf .next node_modules/.cache`
- **Status**: ✅ FIXED

### High-Priority Issues

#### 4. **TypeScript `any` Type Usage** (12+ files)
- **Problem**: Widespread use of `any` breaks type safety
- **Recommendation**: Replace with proper interfaces
- **Priority**: HIGH - Improves type safety
- **Files Affected**:
  - `backend/src/services/ai.service.ts`
  - `backend/src/routes/admin.routes.ts`
  - `backend/src/middlewares/error.middleware.ts`

**Solution Example**:
```typescript
// ❌ Before
const where: any = {}

// ✅ After
interface CourseFilter {
  status?: 'PUBLISHED' | 'DRAFT'
  instructorId?: string
  search?: string
}
const where: CourseFilter = {}
```

#### 5. **Missing Database Transactions**
- **Problem**: Socket operations can create data inconsistencies
- **Solution**: Wrap in Prisma transactions
```typescript
// ✅ Correct way
await prisma.$transaction(async (tx) => {
  await tx.message.create({ data: { ... } })
  await tx.messageCount.update({ ... })
})
```

#### 6. **Silent Error Swallowing**
- **Problem**: Errors caught but not logged
- **Solution**: Log all errors for monitoring
```typescript
// ❌ Before
.catch(() => {}) 

// ✅ After
.catch((err) => {
  logger.error(`Operation failed: ${err.message}`)
})
```

#### 7. **Unverified Stripe Webhooks**
- **Problem**: Anyone can send fake payment webhooks
- **Solution**: Verify webhook signature
```typescript
// ✅ Correct way
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
```

### Medium-Priority Issues

#### 8. **Missing Database Indexes**
- **Problem**: Slow queries on large tables
- **Solution**: Add indexes in migrations
```prisma
model Enrollment {
  userId String @db.Uuid
  courseId String @db.Uuid
  
  @@index([userId])
  @@index([courseId])
  @@unique([userId, courseId])
}
```

#### 9. **Accessibility Violations**
- **Problem**: Buttons without text, images without alt text
- **Solution**: Add proper labels and descriptions
```jsx
// ❌ Before
<button className=".."><Icon /></button>

// ✅ After
<button aria-label="Send message" className="...">
  <Icon />
</button>
```

#### 10. **No Rate Limiting on Auth Endpoints**
- **Problem**: Vulnerable to brute force attacks
- **Solution**: Apply stricter rate limiting
```typescript
// Login limited to 5 attempts per 15 minutes
router.post('/login', 
  loginLimiter,
  (req, res) => { ... }
)
```

### Low-Priority Issues

11. Missing `.env.example` file ✅ FIXED
12. No input validation on complex endpoints
13. Inefficient pagination (offset/limit instead of cursor)
14. No soft delete implementation
15. Missing API documentation

---

## 🤖 AI Integration Guide

### Supported AI Providers

| Provider | Model | Speed | Cost | Quality | Status |
|----------|-------|-------|------|---------|--------|
| **OpenAI** | GPT-4, GPT-3.5 | Medium | $$$ | Excellent | ✅ Integrated |
| **Anthropic** | Claude 3 | Medium | $$$ | Excellent | ✅ Integrated |
| **DeepSeek** | DeepSeek-V2 | Fast | $ | Good | ✅ Integrated |

### Configuring AI Services

#### Option 1: OpenAI (Recommended)
```bash
# 1. Get API key from https://platform.openai.com/api-keys
# 2. Add to .env
OPENAI_API_KEY=sk-your-key-here

# 3. Usage is automatic - no code changes needed
```

#### Option 2: Claude (Anthropic)
```bash
# 1. Get API key from https://console.anthropic.com
# 2. Add to .env
ANTHROPIC_API_KEY=sk-ant-your-key-here

# 3. System automatically switches if OpenAI unavailable
```

#### Option 3: DeepSeek (Budget Option)
```bash
# 1. Get API from https://platform.deepseek.com
# 2. Add to .env
DEEPSEEK_API_KEY=your-key-here

# 3. Used as fallback if other providers down
```

### How AI Provider Selection Works

```
USER MESSAGE
    ↓
1. Is OPENAI_API_KEY configured? YES → Use OpenAI GPT-4
    ↓ NO
2. Is ANTHROPIC_API_KEY configured? YES → Use Claude 3
    ↓ NO
3. Is DEEPSEEK_API_KEY configured? YES → Use DeepSeek
    ↓ NO
4. Return error: "No AI provider configured"
```

### AI Features & Capabilities

**Chat Conversations**
- Context awareness (remembers previous messages)
- Streaming responses
- Token counting for cost tracking
- Conversation history saved
- Delete history option

**AI-Powered Search**
- Natural language queries
- Semantic search (finds related courses)
- Question answering
- Course recommendations

**Code Analysis**
- Explain code snippets
- Find bugs
- Suggest improvements
- Generate documentation

### Costs & Rate Limiting

```
OpenAI GPT-4:
- Input: $0.03 per 1K tokens
- Output: $0.06 per 1K tokens
- Avg conversation: $0.10-0.50

Claude 3 Sonnet:
- Input: $0.003 per 1K tokens
- Output: $0.015 per 1K tokens
- Avg conversation: $0.01-0.05

DeepSeek:
- Input: $0.14 per 1M tokens
- Output: $0.28 per 1M tokens
- Avg conversation: $0.0001-0.001
```

### Token Counting

```typescript
// System automatically counts tokens
// For accurate tracking, use:
const { usage } = await openai.chat.completions.create({...})
console.log(`Used ${usage.total_tokens} tokens`)
// Cost = (input_tokens * input_price + output_tokens * output_price) / 1000
```

---

## ⚡ Performance Optimization

### Frontend Performance

1. **Image Optimization**
   - Use Next.js Image component
   - Automatic WebP conversion
   - Lazy loading
```jsx
import Image from 'next/image'
<Image src="/course.jpg" width={400} height={300} />
```

2. **Code Splitting**
   - Automatic via Next.js
   - Dynamic imports for heavy components
```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSkeleton />
})
```

3. **Animation Performance**
   - Only use GPU-accelerated properties (transform, opacity)
   - Avoid animating layout properties
   - Respect `prefers-reduced-motion`
```typescript
// ✅ Good - uses transform
animate: { x: 100, opacity: 0.5 }

// ❌ Bad - causes reflow
animate: { left: 100, top: 50 }
```

4. **Data Fetching**
   - Use TanStack Query for caching
   - Implement request deduplication
   - Prefetch on user hover
```typescript
const { data } = useQuery({
  queryKey: ['course', courseId],
  queryFn: () => getCourse(courseId),
  staleTime: 5 * 60 * 1000 // 5 minutes
})
```

### Backend Performance

1. **Database Optimization**
```prisma
// Add indexes for frequently queried fields
model Course {
  instructorId String @db.Uuid
  published Boolean

  @@index([instructorId])
  @@index([published])
}
```

2. **Caching Strategy**
```typescript
// Cache expensive operations
const cacheKey = `course:${courseId}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const data = await prisma.course.findUnique({...})
await redis.setex(cacheKey, 3600, JSON.stringify(data))
```

3. **Pagination**
```typescript
// Use cursor-based pagination instead of offset
// Faster, better for large datasets
const courses = await prisma.course.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastId }
})
```

4. **Query Optimization**
```typescript
// Use select to fetch only needed fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
  // Don't fetch: password, refreshToken, etc.
})
```

### Redis Caching Layers

| Content | TTL | Size | Key Pattern |
|---------|-----|------|-------------|
| User sessions | 30 days | ~1KB | `session:{userId}` |
| Course data | 24 hours | ~50KB | `course:{courseId}` |
| Search results | 1 hour | ~100KB | `search:{query}:{page}` |
| Auth tokens blacklist | TTL | ~10KB | `blacklist:{token}` |
| Notification counts | 1 hour | ~100B | `unread:{userId}` |

---

## 🔒 Security Implementation

### Authentication & Authorization

**JWT Token Strategy**
- Access Token: Short-lived (15 min), sent in Authorization header
- Refresh Token: Long-lived (30 days), stored in HttpOnly cookie
- Token Refresh: Automatic renewal before expiry

**Password Security**
- Hashed with bcrypt (not stored in plaintext)
- Minimum 8 characters
- One uppercase, one number, one special character
- Reset token expires in 1 hour

### API Security

**CORS Configuration**
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}))
```

**Rate Limiting**
```
- Login: 5 attempts per 15 minutes
- API: 100 requests per minute (per user)
- File upload: 10 MB per file
```

**Input Validation**
```typescript
// All inputs validated with Zod schemas
const createCourseSchema = z.object({
  title: z.string().min(3).max(200),
  price: z.number().min(0).max(999999),
  description: z.string().min(10)
})
```

### Data Protection

**Encryption**
- Database connections: SSL/TLS
- File storage: Server-side encryption (S3)
- Sensitive data: Encrypted at rest

**Access Control**
- Role-based (User, Instructor, Admin)
- Row-level security on user data
- Course access verification

### Webhook Security

**Stripe Webhooks**
```typescript
// Verify webhook signature
const event = stripe.webhooks.constructEvent(
  req.body,
  req.get('stripe-signature'),
  process.env.STRIPE_WEBHOOK_SECRET
)
```

---

## 🚀 Deployment Guide

### Environment Setup

**Staging Environment**
```
- Use separate database instance
- Test keys for external APIs
- Enable all logging for debugging
- Daily database backups
```

**Production Environment**
```
- Managed database (RDS, Cloud SQL)
- Managed Redis (ElastiCache, Cloud Memorystore)
- Live API keys
- Encrypted secrets (AWS Secrets Manager)
- Daily + hourly backups
- Multi-region setup recommended
```

### Docker Deployment

```bash
# Build images
docker build -t scs-backend ./backend
docker build -t scs-frontend ./frontend

# Deploy with docker-compose
docker compose -f docker-compose.yml up -d

# Or use Kubernetes for scaling
kubectl apply -f k8s/deployment.yaml
```

### Environment Variables Required

**Backend**
- DATABASE_URL
- REDIS_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- FRONT...

END_URL
- STRIPE_SECRET_KEY
- AWS credentials
- SMTP configuration
- AI API keys (at least one)

**Frontend**
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_WS_URL

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name add_new_field

# Deploy in production
npx prisma migrate deploy

# Rollback (dev only)
npx prisma migrate resolve --rolled-back migration_name
```

### Monitoring & Logging

**Recommended Tools**
- CloudWatch (AWS) for logs and metrics
- Sentry for error tracking
- DataDog for performance monitoring
- Prometheus + Grafana for custom metrics

**Important Metrics**
- API response time
- Database query performance
- Redis hit rate
- Error rates by endpoint
- AI API costs and usage

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Issue: "Connect ECONNREFUSED" - Can't connect to database
```
SOLUTION:
1. Check database container is running: docker ps
2. Verify DATABASE_URL in .env
3. Use hostname 'postgres' (not localhost) in Docker
4. Wait 30 seconds for database startup
```

#### Issue: "JWT token invalid" on all requests
```
SOLUTION:
1. Check JWT_ACCESS_SECRET matches in env and code
2. Verify token isn't expired: decode at jwt.io
3. Ensure Authorization header format: "Bearer {token}"
4. Check token wasn't modified by proxies
```

#### Issue: Socket.io messages not received
```
SOLUTION:
1. Verify WebSocket URL in frontend NEXT_PUBLIC_WS_URL
2. Check CORS settings: origin must match frontend URL
3. Ensure Socket.io middleware auth passes
4. Check browser console for WebSocket errors
5. May need to allow WebSocket upgrade in proxy
```

#### Issue: S3 file uploads failing
```
SOLUTION:
1. Verify AWS credentials in .env
2. Check S3 bucket CORS configuration
3. Ensure IAM user has s3:PutObject permission
4. Bucket policy allows public access (if needed)
5. File size under 100 MB limit
6. File type allowed (image/video/document)
```

#### Issue: AI API returning 401 Unauthorized
```
SOLUTION:
1. Verify API key is correct and active
2. Check provider's rate limit hasn't been exceeded
3. Ensure API key has correct permissions
4. Regenerate key if compromised
5. Check API key isn't in .env.example (exposed!)
```

#### Issue: High memory usage / crashes
```
SOLUTION:
1. Check for memory leaks in long-running processes
2. Reduce Redis key TTL to avoid accumulation
3. Implement pagination on large queries
4. Clear build cache: docker system prune -a
5. Check AI service responses (can be large)
```

---

## 📞 Support & Contribution

### Getting Help
1. Check this guide's troubleshooting section
2. Review GitHub issues
3. Check backend logs: `docker compose logs backend`
4. Check frontend console: Browser DevTools

### Contributing
- Create feature branch: `git checkout -b feature/name`
- Write tests for new features
- Follow code style: ESLint + Prettier configured
- Submit PR with description

---

## 📝 Version History

- **v2.0** (Current) - Complete rewrite with modern stack
  - React 18 + Next.js 14
  - TypeScript throughout
  - Prisma ORM
  - Socket.io for real-time
  - AI integration

- **v1.0** - Legacy version (deprecated)

---

## 📄 License

This project is proprietary. All rights reserved.

---

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/docs/)
- [Stripe API](https://stripe.com/docs/api)
- [Socket.io Docs](https://socket.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Last Updated**: March 24, 2026
**Maintained by**: SCS Development Team
