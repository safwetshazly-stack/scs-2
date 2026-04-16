# Module Architecture Migration Checklist

## Phase Overview

- **Phase 1:** Foundation & File Migration (Week 1)
- **Phase 2:** Service Layer Abstraction (Week 1-2)
- **Phase 3:** Module Boundaries & Finalization (Week 2)
- **Phase 4:** Event-Driven Communication (Week 2-3, Optional)
- **Phase 5:** Bootstrap & Integration (Week 2)
- **Phase 6:** Testing & Validation (Week 2-3)

---

## Phase 1: Foundation & File Migration ✅

### Directory Structure Creation

- [x] Create module directories structure
  - [x] modules/auth/{controllers,services,routes,types}
  - [x] modules/user/{controllers,services,routes,types}
  - [x] modules/payment/{controllers,services,routes,types}
  - [x] modules/course/{controllers,services,routes,types}
  - [x] modules/chat/{controllers,services,routes,types}
  - [x] modules/ai/{controllers,services,routes,types}
  - [x] modules/community/{controllers,services,routes,types}
  - [x] modules/book/{controllers,services,routes,types}
  - [x] modules/platform/{controllers,services,routes,types}
  - [x] modules/admin/{controllers,services,routes,types}
  - [x] shared/{database,middlewares,utils,config,queue}

### File Migration

- [ ] **Auth Module**
  - [ ] Copy src/controllers/auth.controller.ts → modules/auth/controllers/
  - [ ] Copy src/routes/auth.routes.ts → modules/auth/routes/
  - [ ] Update import paths in auth.controller.ts
  - [ ] Update import paths in auth.routes.ts
  - [ ] Create modules/auth/types/index.ts
  - [ ] Create modules/auth/services/auth.service.ts (stub)

- [ ] **User Module**
  - [ ] Copy src/controllers/user.controller.ts → modules/user/controllers/
  - [ ] Copy src/routes/user.routes.ts → modules/user/routes/
  - [ ] Update import paths
  - [ ] Create modules/user/types/index.ts
  - [ ] Create modules/user/services/user.service.ts (stub)

- [ ] **Payment Module**
  - [ ] Copy src/controllers/payment.controller.ts → modules/payment/controllers/
  - [ ] Copy src/routes/payment.routes.ts → modules/payment/routes/
  - [ ] Update import paths
  - [ ] Create modules/payment/types/index.ts
  - [ ] Create modules/payment/services/payment.service.ts (stub)

- [ ] **Course Module**
  - [ ] Copy src/controllers/course.controller.ts → modules/course/controllers/
  - [ ] Copy src/routes/course.routes.ts → modules/course/routes/
  - [ ] Copy src/controllers/webhook.controller.ts → modules/course/controllers/ (video webhooks)
  - [ ] Update import paths
  - [ ] Create modules/course/types/index.ts
  - [ ] Create modules/course/services/course.service.ts (stub)

- [ ] **Chat Module**
  - [ ] Copy src/controllers/chat.controller.ts → modules/chat/controllers/
  - [ ] Copy src/routes/chat.routes.ts → modules/chat/routes/
  - [ ] Copy src/controllers/meeting.controller.ts → modules/chat/controllers/
  - [ ] Copy src/routes/notification.routes.ts → modules/chat/routes/
  - [ ] Copy src/utils/socket.ts → modules/chat/socket.ts
  - [ ] Update import paths
  - [ ] Create modules/chat/types/index.ts
  - [ ] Create modules/chat/services/chat.service.ts (stub)

- [ ] **AI Module**
  - [ ] Copy src/controllers/ai.controller.ts → modules/ai/controllers/
  - [ ] Copy src/routes/ai.routes.ts → modules/ai/routes/
  - [ ] Copy src/services/ai.service.ts → modules/ai/services/
  - [ ] Update import paths
  - [ ] Create modules/ai/types/index.ts

- [ ] **Community Module**
  - [ ] Copy src/controllers/community.controller.ts → modules/community/controllers/
  - [ ] Copy src/routes/community.routes.ts → modules/community/routes/
  - [ ] Update import paths
  - [ ] Create modules/community/types/index.ts
  - [ ] Create modules/community/services/community.service.ts (stub)

- [ ] **Book Module**
  - [ ] Copy src/controllers/book.controller.ts → modules/book/controllers/
  - [ ] Copy src/routes/book.routes.ts → modules/book/routes/
  - [ ] Update import paths
  - [ ] Create modules/book/types/index.ts
  - [ ] Create modules/book/services/book.service.ts (stub)

- [ ] **Platform Module**
  - [ ] Copy src/controllers/platform.controller.ts → modules/platform/controllers/
  - [ ] Copy src/routes/platform.routes.ts → modules/platform/routes/
  - [ ] Update import paths
  - [ ] Create modules/platform/types/index.ts
  - [ ] Create modules/platform/services/platform.service.ts (stub)

- [ ] **Admin Module**
  - [ ] Create modules/admin/controllers/admin.controller.ts
  - [ ] Create modules/admin/routes/admin.routes.ts
  - [ ] Create modules/admin/types/index.ts
  - [ ] Create modules/admin/services/admin.service.ts

- [ ] **Upload Module** (New or merge with Chat)
  - [ ] Copy src/controllers/upload.controller.ts → modules/chat/controllers/ (or create separate upload module)
  - [ ] Copy src/routes/upload.routes.ts → modules/chat/routes/

### Shared Layer Migration

- [x] Create shared/database/prisma.ts (singleton)
- [x] Create shared/database/redis.ts (singleton)
- [x] Copy src/middlewares/auth.middleware.ts → shared/middlewares/
- [ ] Copy src/middlewares/error.middleware.ts → shared/middlewares/
- [ ] Copy src/middlewares/validate.middleware.ts → shared/middlewares/
- [ ] Copy src/middlewares/sanitize.middleware.ts → shared/middlewares/
- [ ] Copy src/utils/jwt.ts → shared/utils/
- [ ] Copy src/utils/logger.ts → shared/utils/
- [ ] Copy src/utils/errors.ts → shared/utils/
- [ ] Copy src/utils/cache.ts → shared/utils/
- [ ] Copy src/utils/pagination.ts → shared/utils/
- [ ] Copy src/utils/rateLimiter.ts → shared/utils/
- [ ] Copy src/utils/slugify.ts → shared/utils/
- [ ] Copy src/utils/email.ts → shared/utils/
- [ ] Copy src/config/env.ts → shared/config/
- [ ] Move src/queues/video.queue.ts → shared/queue/
- [ ] Move src/workers/video.worker.ts → shared/queue/workers/

### Build Verification

- [ ] `npm run build` passes with no errors
- [ ] TypeScript compilation clean
- [ ] No missing imports
- [ ] No circular dependencies detected

---

## Phase 2: Service Layer Abstraction

### Create Service Classes

Each module needs a service class that:
- Manages database operations
- Implements business logic
- Exposes module functionality
- Receives dependencies via constructor

### Auth Service
- [ ] Extract register() logic
- [ ] Extract login() logic
- [ ] Extract refreshToken() logic
- [ ] Extract logout() logic
- [ ] Extract passwordReset() logic
- [ ] Extract emailVerification() logic
- [ ] Update auth.controller.ts to use service

### User Service
- [ ] Extract getProfile() logic
- [ ] Extract updateProfile() logic
- [ ] Extract follow() logic
- [ ] Extract getFollowers() logic
- [ ] Extract updateSettings() logic
- [ ] Extract deleteAccount() logic
- [ ] Update user.controller.ts to use service

### Payment Service
- [ ] Extract createCheckout() logic
- [ ] Extract stripeWebhook() logic
- [ ] Extract cancelSubscription() logic
- [ ] Extract getPaymentHistory() logic
- [ ] Create RevenueSplittingService for commission logic
- [ ] Update payment.controller.ts to use service

### Course Service
- [ ] Extract getCourses() logic
- [ ] Extract createCourse() logic
- [ ] Extract updateCourse() logic
- [ ] Extract deleteCourse() logic
- [ ] Extract enrollCourse() logic
- [ ] Extract updateProgress() logic
- [ ] Extract publishCourse() logic
- [ ] Create LessonService for lesson management
- [ ] Update course.controller.ts to use service

### Chat Service
- [ ] Extract getConversations() logic
- [ ] Extract getMessages() logic
- [ ] Extract sendMessage() logic
- [ ] Extract createChannel() logic
- [ ] Update chat.controller.ts to use service

### AI Service
- [ ] Extract sendMessage() logic
- [ ] Extract streamMessage() logic
- [ ] Extract checkUsageLimit() logic
- [ ] Extract getConversations() logic
- [ ] Update ai.controller.ts to use service

### Community Service
- [ ] Extract getCommunities() logic
- [ ] Extract createCommunity() logic
- [ ] Extract joinCommunity() logic
- [ ] Extract createPost() logic
- [ ] Update community.controller.ts to use service

### Book Service
- [ ] Extract getBooks() logic
- [ ] Extract createBook() logic
- [ ] Extract purchaseBook() logic
- [ ] Extract addReview() logic
- [ ] Update book.controller.ts to use service

### Platform Service
- [ ] Extract createPlatform() logic
- [ ] Extract updatePlatform() logic
- [ ] Extract getPlatforms() logic
- [ ] Update platform.controller.ts to use service

### Admin Service
- [ ] Create getStats() logic
- [ ] Create getUserList() logic
- [ ] Create banUser() logic
- [ ] Create getSystemHealth() logic

### Validation

- [ ] All controllers delegate to services
- [ ] No database calls in controllers
- [ ] All business logic in services
- [ ] `npm run build` passes
- [ ] No TypeScript errors

---

## Phase 3: Module Boundaries & Finalization

### Create Module Index Files

- [x] modules/auth/index.ts (public API)
- [x] modules/user/index.ts
- [x] modules/payment/index.ts
- [x] modules/course/index.ts
- [x] modules/chat/index.ts
- [x] modules/ai/index.ts
- [x] modules/community/index.ts
- [x] modules/book/index.ts
- [x] modules/platform/index.ts
- [x] modules/admin/index.ts

### Create Type Definition Files

- [ ] modules/auth/types/index.ts
- [ ] modules/user/types/index.ts
- [ ] modules/payment/types/index.ts
- [ ] modules/course/types/index.ts
- [ ] modules/chat/types/index.ts
- [ ] modules/ai/types/index.ts
- [ ] modules/community/types/index.ts
- [ ] modules/book/types/index.ts
- [ ] modules/platform/types/index.ts
- [ ] modules/admin/types/index.ts

### Create Route Files

- [ ] modules/auth/routes/auth.routes.ts
- [ ] modules/user/routes/user.routes.ts
- [ ] modules/payment/routes/payment.routes.ts
- [ ] modules/course/routes/course.routes.ts
- [ ] modules/chat/routes/chat.routes.ts
- [ ] modules/ai/routes/ai.routes.ts
- [ ] modules/community/routes/community.routes.ts
- [ ] modules/book/routes/book.routes.ts
- [ ] modules/platform/routes/platform.routes.ts
- [ ] modules/admin/routes/admin.routes.ts

### Validate Module Boundaries

- [ ] Run `npm run validate:dependencies`
- [ ] No modules import from other modules' internals
- [ ] All cross-module imports go through index.ts
- [ ] No circular dependencies
- [ ] Dependency graph documented

### Create Module README Files

- [ ] modules/auth/README.md
- [ ] modules/user/README.md
- [ ] modules/payment/README.md
- [ ] modules/course/README.md
- [ ] modules/chat/README.md
- [ ] modules/ai/README.md
- [ ] modules/community/README.md
- [ ] modules/book/README.md
- [ ] modules/platform/README.md
- [ ] modules/admin/README.md

---

## Phase 4: Event-Driven Communication (Optional)

### Create Event System

- [ ] Create shared/events/event-emitter.ts
- [ ] Create shared/events/event-types.ts
- [ ] Initialize event emitter in server.ts

### Module Events

**Payment Module emits:**
- [ ] payment:checkout-created
- [ ] payment:completed
- [ ] payment:failed
- [ ] subscription:created
- [ ] subscription:cancelled

**Course Module emits:**
- [ ] course:enrolled
- [ ] course:completed
- [ ] lesson:completed

**AI Module emits:**
- [ ] ai:message-sent
- [ ] ai:usage-updated

**Chat Module emits:**
- [ ] message:sent
- [ ] note: may not need events, could use direct service calls

### Module Listeners

- [ ] Course module listens to payment:course-purchased
- [ ] AI module listens to subscription:created (reset limits)
- [ ] Notification module listens to all events
- [ ] User module listens to subscription:created (update tier)

### Validation

- [ ] Events defined in shared/events/
- [ ] All event emissions logged
- [ ] All listeners registered in server.ts
- [ ] Event flow documented
- [ ] Dead letter queue handled

---

## Phase 5: Bootstrap & Integration

### Update server.ts

- [ ] Import all modules from their index.ts files
- [ ] Register auth routes (public)
- [ ] Register auth middleware
- [ ] Register all protected routes
- [ ] Register error handling middleware
- [ ] Initialize event listeners
- [ ] Initialize queues (video processing)
- [ ] Initialize Socket.IO with Redis adapter

### server.ts Template

```typescript
import express from 'express'
import { prisma } from './shared/database/prisma'
import { connectRedis } from './shared/database/redis'
import { authenticate, requireAdmin } from './shared/middlewares/auth.middleware'
import * as auth from './modules/auth'
import * as user from './modules/user'
// ... import all modules

const app = express()

// Middleware
app.use(express.json())

// Public routes
app.use('/api/auth', auth.authRoutes)

// Protect remaining routes
app.use(authenticate)

// Protected routes
app.use('/api/users', user.userRoutes)
// ... register remaining modules

// Admin routes
app.use(requireAdmin, admin.adminRoutes)

// Error handling
app.use(errorHandler)

export default app
```

### Integration Steps

- [ ] Update src/server.ts with module imports
- [ ] Verify all routes register correctly
- [ ] Test API endpoints
- [ ] Verify middleware chains work
- [ ] Check Socket.IO connections
- [ ] Verify queue processing

### Build & Test

- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] All imports resolve
- [ ] Server starts without errors
- [ ] Health check endpoint responds

---

## Phase 6: Testing & Validation

### Unit Tests

Each module should have:

- [ ] `__tests__/module.service.spec.ts` (service tests)
- [ ] `__tests__/module.controller.spec.ts` (controller tests)
- [ ] Test coverage >80%

Example structure:
```
modules/auth/__tests__/
  ├── auth.service.spec.ts
  ├── auth.controller.spec.ts
  └── auth.integration.spec.ts
```

### Integration Tests

- [ ] Test cross-module communication
- [ ] Test event flow
- [ ] Test API endpoints
- [ ] Test error handling

### E2E Tests

- [ ] User registration → login → profile update
- [ ] Course creation → enrollment → payment
- [ ] AI conversation flow
- [ ] Chat messaging
- [ ] Payment webhook handling

### Coverage Targets

- [ ] Unit tests: >80% coverage
- [ ] Integration tests: All happy paths
- [ ] E2E tests: Critical user flows

### Performance Tests

- [ ] Module load time <1.5x baseline
- [ ] Memory usage <10% overhead
- [ ] Response times p99 <100ms
- [ ] Database query optimization

### Validation Scripts

- [ ] `npm run validate:dependencies` - Check module boundaries
- [ ] `npm run test` - Run all tests
- [ ] `npm run coverage` - Generate coverage report
- [ ] `npm run build` - TypeScript compilation
- [ ] `npm run lint` - Code style checks

---

## Documentation Checklist

### Architecture Documentation

- [ ] ARCHITECTURE_PLAN.md created ✅
- [ ] IMPLEMENTATION_GUIDE.md created ✅
- [ ] Dependency graph diagram created
- [ ] Module interaction matrix created
- [ ] Database schema updated for modules
- [ ] API contract document created

### Module Documentation

Each module needs:

- [ ] ./README.md with:
  - [ ] Module purpose
  - [ ] Public API methods
  - [ ] Dependency list
  - [ ] Example usage
  - [ ] Configuration needed
  - [ ] Error handling

### Code Documentation

- [ ] JSDoc comments on all public methods
- [ ] Example requests/responses in controllers
- [ ] Database migrations documented
- [ ] Environment variables documented
- [ ] Event schema described

---

## Success Metrics

### Code Quality
- [ ] 0 TypeScript errors in build
- [ ] ESLint passes all files
- [ ] >80% test coverage
- [ ] No circular dependencies
- [ ] <5 import violations per module

### Performance
- [ ] Module startup <1.5x baseline
- [ ] Memory FootPrint <10% increase
- [ ] API response times p99 <100ms
- [ ] Query performance verified

### Architecture
- [ ] 9 independent modules
- [ ] Clear module boundaries
- [ ] Event-driven cross-module communication
- [ ] Service layer abstraction
- [ ] Shared utilities centralized

### Operability
- [ ] All modules can be deployed separately
- [ ] Error handling consistent
- [ ] Logging structured across modules
- [ ] Monitoring instrumented
- [ ] Health checks working

---

## Sign-Off

- [ ] Architecture review completed
- [ ] All phases implemented
- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation complete
- [ ] Performance validated
- [ ] **READY FOR PRODUCTION** ✅

---

## Timeline

| Phase | Duration | Status | Owner |
|-------|----------|--------|-------|
| 1. Foundation | 2-3 days | ⏳ Pending | - |
| 2. Services | 3-4 days | ⏳ Pending | - |
| 3. Boundaries | 2-3 days | ⏳ Pending | - |
| 4. Events | 2 days | ⏳ Optional | - |
| 5. Bootstrap | 1-2 days | ⏳ Pending | - |
| 6. Testing | 3-4 days | ⏳ Pending | - |
| **TOTAL** | **13-18 days** | | |

---

## Notes

- Phases 1-3 are critical path
- Phase 4 (events) is optional but recommended
- Phases 5-6 can be done in parallel
- Maintain monolith deployment during migration
- No breaking changes to API
- Gradual module conversion is fine (don't have to do all at once)

