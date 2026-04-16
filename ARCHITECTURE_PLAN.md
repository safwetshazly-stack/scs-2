# SCS Platform - Modular Monolith Architecture Refactoring Plan

## Executive Summary

This document outlines the refactoring of the SCS backend from a flat architecture to a **modular monolith** with clear boundaries, service abstractions, and independent module deployment capabilities.

---

## Current Architecture Issues

```
src/
├── controllers/          ❌ 11 files mixed responsibilities
├── routes/              ❌ 14 files not organized by domain
├── services/            ❌ Unclear boundaries
├── middlewares/         ❌ Global scope
├── utils/               ❌ No clear ownership
└── config/              ❌ Shared across all modules
```

**Problems:**
- No clear domain boundaries
- Difficult to understand dependencies
- Hard to scale individual features
- No module-level testing
- Tight coupling between features

---

## Target Architecture: Modular Monolith

```
src/
├── modules/                          # Domain modules
│   ├── auth/                         # Authentication & Authorization
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── types/
│   │   └── index.ts (public API)
│   │
│   ├── user/                         # User profiles & management
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── payment/                      # Payment & billing
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── course/                       # Courses & learning
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── chat/                         # Messaging
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── ai/                           # AI features
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── community/                    # Communities
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── book/                         # E-books
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── platform/                     # Platform management
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── types/
│   │   └── index.ts
│   │
│   └── admin/                        # Admin features
│       ├── controllers/
│       ├── services/
│       ├── routes/
│       ├── types/
│       └── index.ts
│
├── shared/                           # Shared across all modules
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── sanitize.middleware.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── pagination.ts
│   │   ├── jwt.ts
│   │   ├── cache.ts
│   │   ├── rateLimiter.ts
│   │   └── socket.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── database/
│   │   ├── prisma.ts
│   │   └── redis.ts
│   │
│   └── queue/
│       ├── video.queue.ts
│       └── workers/
│
├── server.ts                         # App bootstrap
└── index.ts                          # Entry point
```

---

## Module Responsibilities & Boundaries

### 1. **Auth Module** 🔐
**Responsibility:** Authentication, authorization, token management  
**Public API:**
- `register()`
- `login()`
- `refreshToken()`
- `logout()`
- Middleware: `authenticate`, `optionalAuth`, `requireRole()`

**Can Access:**
- User table (read/write)
- EmailVerification table
- PasswordReset table
- UserSession table
- JWT utils
- Email service

**Cannot Access:**
- Payment data
- Course data
- Any user's private data without auth

**Exports:** `AuthController`, `AuthService`, `authRoutes`, `authMiddlewares`

---

### 2. **User Module** 👤
**Responsibility:** User profiles, settings, relationships  
**Public API:**
- `getProfile()`
- `updateProfile()`
- `follow()`
- `getFollowers()`
- `updateSettings()`

**Can Access:**
- User table
- UserProfile table
- UserSettings table
- Follow table
- BlockedUser table

**Cannot Access:**
- Auth tokens directly
- Payment data
- Course enrollment (read-only via Course module)
- Password hashes (auth module only)

**Exports:** `UserController`, `UserService`, `userRoutes`

---

### 3. **Payment Module** 💳
**Responsibility:** Payments, subscriptions, billing  
**Public API:**
- `createCheckout()`
- `stripeWebhook()`
- `getPaymentHistory()`
- `cancelSubscription()`

**Can Access:**
- Payment table
- WorkSubscription table
- SubscriptionPlan table
- Stripe API
- User wallet (update only)

**Cannot Access:**
- User auth data
- Course content
- AI usage directly (read-only for webhook validation)

**Dependencies:**
- Course Module: For course enrollment hook
- Book Module: For book purchase hook
- AI Module: For token reset hook

**Exports:** `PaymentController`, `PaymentService`, `paymentRoutes`, `PaymentEvents`

---

### 4. **Course Module** 📚
**Responsibility:** Courses, lessons, modules, enrollments  
**Public API:**
- `getCourses()`
- `createCourse()`
- `enrollCourse()`
- `updateProgress()`
- `publishCourse()`

**Can Access:**
- Course table
- Module table
- Lesson table
- CourseEnrollment table
- CourseReview table
- LessonProgress table

**Cannot Access:**
- Payment data
- User auth tokens

**Listens To:**
- PaymentModule: `course.purchased` event

**Exports:** `CourseController`, `CourseService`, `courseRoutes`, `CourseEvents`

---

### 5. **Chat Module** 💬
**Responsibility:** Messaging, conversations, channels  
**Public API:**
- `getConversations()`
- `sendMessage()`
- `getMessages()`
- `createChannel()`

**Can Access:**
- Message table
- Conversation table
- ChannelMessage table
- ConversationMember table
- Channel table

**Socket Events:**
- `message:send`
- `message:read`
- `typing:start`
- `typing:stop`

**Exports:** `ChatController`, `ChatService`, `chatRoutes`, `ChatSocket`

---

### 6. **AI Module** 🤖
**Responsibility:** AI conversations, request tracking  
**Public API:**
- `getConversations()`
- `sendMessage()`
- `streamMessage()`
- `checkUsageLimit()`

**Can Access:**
- AiConversation table
- AiMessage table
- AiUsage table
- OpenAI/Anthropic/DeepSeek APIs

**Listens To:**
- PaymentModule: `subscription.created` → reset usage

**Exports:** `AiController`, `AiService`, `aiRoutes`

---

### 7. **Community Module** 👥
**Responsibility:** Communities, channels, posts  
**Public API:**
- `getCommunities()`
- `createCommunity()`
- `joinCommunity()`
- `createPost()`
- `sendChannelMessage()`

**Can Access:**
- Community table
- CommunityMember table
- CommunityChannel table
- Post table
- ChannelMessage table
- PostLike table
- PostComment table

**Exports:** `CommunityController`, `CommunityService`, `communityRoutes`

---

### 8. **Book Module** 📖
**Responsibility:** E-books, purchases, reviews  
**Public API:**
- `getBooks()`
- `createBook()`
- `purchaseBook()`
- `addReview()`

**Can Access:**
- Book table
- BookPurchase table
- BookReview table

**Listens To:**
- PaymentModule: `book.purchased` event

**Exports:** `BookController`, `BookService`, `bookRoutes`, `BookEvents`

---

### 9. **Platform Module** 🏢
**Responsibility:** Platform management by creators  
**Public API:**
- `createPlatform()`
- `updatePlatform()`
- `getPlatforms()`

**Can Access:**
- Platform table

**Exports:** `PlatformController`, `PlatformService`, `platformRoutes`

---

### 10. **Admin Module** 🛡️
**Responsibility:** System administration  
**Public API:**
- `getStats()`
- `getUserList()`
- `banUser()`
- `getSystemHealth()`

**Can Access (Read-Only):**
- All tables (for statistics)
- All modules' data

**Exports:** `AdminController`, `AdminService`, `adminRoutes`

---

## Shared Layer Architecture

### Middlewares (Shared)
- `auth.middleware.ts`: Authentication & role checks
- `error.middleware.ts`: Centralized error handling
- `validate.middleware.ts`: Input validation
- `sanitize.middleware.ts`: XSS protection

### Utils (Shared)
- `logger.ts`: Winston logging
- `errors.ts`: AppError class, error types
- `jwt.ts`: Token generation/validation
- `cache.ts`: Redis caching layer
- `pagination.ts`: Pagination helpers
- `rateLimiter.ts`: Rate limiting

### Database (Shared)
- `prisma.ts`: Prisma client singleton
- `redis.ts`: Redis client singleton

### Queue (Shared)
- `video.queue.ts`: Video processing queue
- `workers/`: Background workers

---

## Module Dependencies Map

```
┌─────────────────────────────────────────────────────────┐
│                      Shared Layer                        │
│  (Middleware, Utils, DB, Config, Types)                 │
└─────────────────────────────────────────────────────────┘
                          ▲
        ┌─────────────────┼─────────────────┐
        │                 │                  │
    ┌───┴──┐         ┌────┴────┐      ┌────┴────┐
    │ Auth │         │ Payment  │      │   AI    │
    └───┬──┘         └────┬─────┘      └────┬────┘
        │                 │                  │
        │       ┌─────────┼──────────┐       │
        │       │         │          │       │
    ┌───▼──┐   │   ┌──────┴──┐  ┌──┴─────┐ │
    │ User │◄──┼───┤ Course  │  │  Book  │ │
    └──────┘   │   └──────────┘  └────────┘ │
            ┌──┴──────────┐                  │
            │  Community  │◄─────────────────┘
            └─────────────┘

    ┌─────────┐      ┌──────────┐
    │  Chat   │      │ Platform │
    └─────────┘      └──────────┘

    ┌──────────────────────────────┐
    │      Admin (Read-Only)       │
    │   (Accesses all modules)     │
    └──────────────────────────────┘
```

**Rules:**
- Auth Module: No dependencies (lowest level)
- User Module: Depends on Auth only
- Payment Module: Depends on Auth, User
- Course Module: Depends on Auth, Payment
- AI Module: Depends on Auth, Payment
- Chat Module: Depends on Auth, User
- Community Module: Depends on Auth, User
- Book Module: Depends on Auth, Payment
- Platform Module: Depends on Auth, User
- Admin Module: Read-only access to all

---

## Refactoring Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create module folder structure
- [ ] Move controllers to modules
- [ ] Move services to modules
- [ ] Create module index.ts files
- [ ] Update imports in moved files

### Phase 2: Service Abstraction (Week 1-2)
- [ ] Create service interfaces for each module
- [ ] Move business logic to services
- [ ] Remove direct DB access from controllers
- [ ] Create unit test structure

### Phase 3: Module Boundaries (Week 2)
- [ ] Create module public API files
- [ ] Implement cross-module communication
- [ ] Create event emitters for module events
- [ ] Move shared utilities

### Phase 4: Testing & Validation (Week 2-3)
- [ ] Write module-level tests
- [ ] Test module boundaries
- [ ] Validate dependency graph
- [ ] Performance testing

### Phase 5: Documentation (Week 3)
- [ ] Update module README files
- [ ] Document module APIs
- [ ] Create dependency diagram
- [ ] Update main README

---

## Benefits

### Scalability
- Independent module scaling
- Per-module database optimization
- Ready for strangler fig pattern migration
- Easy to extract to microservices later

### Maintainability
- Clear ownership per module
- Easy to understand domain logic
- Easy to test in isolation
- Self-contained features

### Team Organization
- One team per module
- Parallel development
- Reduced merge conflicts
- Clear code review responsibilities

### Performance
- Module-level caching strategy
- Per-module rate limiting
- Optimized DB queries per domain
- Efficient dependency graph

### Future-Proofing
- Ready for microservices extraction
- Service mesh compatible
- Event-driven architecture ready
- Cloud-native deployable

---

## Files to Move

### Auth Module
```
FROM:
  src/controllers/auth.controller.ts
  src/routes/auth.routes.ts
  src/middlewares/auth.middleware.ts

TO:
  src/modules/auth/controllers/auth.controller.ts
  src/modules/auth/routes/auth.routes.ts
  src/modules/auth/middlewares/auth.middleware.ts
  src/modules/auth/services/auth.service.ts (NEW)
  src/modules/auth/types/index.ts (NEW)
  src/modules/auth/index.ts (PUBLIC API)
```

### User Module
Similar structure for user, payment, course, etc.

---

## Code Changes Required

### 1. Service Layer Pattern
```typescript
// Before: Controller with DB logic
export const getProfile = async (req, res, next) => {
  const user = await prisma.user.findUnique(...)
  // ...
}

// After: Service abstraction
export const getUserService = (prisma) => ({
  getProfile: (userId) => prisma.user.findUnique(...)
})

export const getProfile = (service) => async (req, res, next) => {
  const profile = await service.getProfile(req.user.id)
  // ...
}
```

### 2. Module Index (Public API)
```typescript
// src/modules/auth/index.ts
export { authRoutes } from './routes/auth.routes'
export { authMiddlewares } from './middlewares/auth.middleware'
export type { AuthPayload } from './types'
export { AuthService } from './services/auth.service'
```

### 3. Cross-Module Communication
```typescript
// Event-driven communication
const eventEmitter = new EventEmitter()

// Payment module emits
eventEmitter.emit('payment:course-purchased', { courseId, userId })

// Course module listens
eventEmitter.on('payment:course-purchased', async ({ courseId, userId }) => {
  await courseService.enrollStudent(courseId, userId)
})
```

---

## Success Metrics

✅ **Code Organization:**
- Clear module boundaries
- <5 import violations per module
- 0 circular dependencies

✅ **Performance:**
- Sub-100ms module load time
- <1MB per module size
- Efficient database queries

✅ **Scalability:**
- Support 1M concurrent users
- Sub-100ms response time (p99)
- <10% resource overhead

✅ **Testing:**
- >80% code coverage
- Module-level tests passing
- E2E tests passing

✅ **Documentation:**
- All modules documented
- API contracts defined
- Dependencies mapped

---

## Next Steps

1. Create module structure
2. Begin Phase 1: Foundation
3. Implement service abstraction
4. Add comprehensive tests
5. Update documentation
6. Deploy incrementally

---

**Status:** ✅ Architecture Planned | 🔄 Implementation Ready
