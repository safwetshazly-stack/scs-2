# Module Architecture Implementation Guide

## Overview

This guide walks through implementing the modular monolith architecture. The refactoring will be done in phases to maintain stability and allow for testing between phases.

---

## Phase 1: Foundation & Migration (Week 1)

### Step 1.1: Copy Controllers to Modules

All existing controllers move to `src/modules/{module}/controllers/`

```bash
# Auth Module
cp src/controllers/auth.controller.ts → src/modules/auth/controllers/

# User Module
cp src/controllers/user.controller.ts → src/modules/user/controllers/

# ... and so on for all 11 controllers
```

**Files to migrate:**
```
auth.controller.ts          → modules/auth/controllers/
user.controller.ts          → modules/user/controllers/
payment.controller.ts       → modules/payment/controllers/
course.controller.ts        → modules/course/controllers/
book.controller.ts          → modules/book/controllers/
ai.controller.ts            → modules/ai/controllers/
chat.controller.ts          → modules/chat/controllers/
community.controller.ts     → modules/community/controllers/
platform.controller.ts      → modules/platform/controllers/
meeting.controller.ts       → modules/chat/controllers/
upload.controller.ts        → modules/chat/controllers/ (or new upload module)
webhook.controller.ts       → modules/course/controllers/
```

### Step 1.2: Copy Routes to Modules

All existing routes move to `src/modules/{module}/routes/`

```bash
# 14 route files to move
cp src/routes/*.ts → src/modules/{module}/routes/
```

### Step 1.3: Update Import Paths

In each moved controller, update imports from:

```typescript
// OLD
import { prisma } from '../../../prisma'
import { AppError } from '../utils/errors'

// NEW
import { prisma } from '../../../../shared/database/prisma'
import { AppError } from '../../../../shared/utils/errors'
```

---

## Phase 2: Service Layer Abstraction (Week 1-2)

### Step 2.1: Create Service Template

For each module, create `src/modules/{module}/services/{module}.service.ts`:

```typescript
// Example: Auth Service

import { prisma } from '../../../../shared/database/prisma'
import { redis } from '../../../../shared/database/redis'
import type { AuthPayload } from '../types'

export class AuthService {
  /**
   * Register new user
   */
  async register(email: string, password: string, name: string): Promise<User> {
    // Move registration logic from controller here
    return await prisma.user.create({
      data: { email, name, password: hashPassword(password) }
    })
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Move login logic from controller here
    const user = await prisma.user.findUnique({ where: { email } })
    // ...validate password
    return generateTokens(user.id, user.role, user.subscriptionTier)
  }

  /**
   * Refresh token
   */
  async refreshToken(token: string): Promise<{ accessToken: string }> {
    // Extract logic from controller
  }
}

// Export service instance
export const authService = new AuthService()
```

### Step 2.2: Refactor Controllers to Use Services

```typescript
// OLD: Controller with DB logic
export const register = async (req, res, next) => {
  const user = await prisma.user.create(...)
  // ...
}

// NEW: Controller delegates to service
import { authService } from '../services/auth.service'

export const register = async (req, res, next) => {
  try {
    const user = await authService.register(
      req.body.email,
      req.body.password,
      req.body.name
    )
    res.status(201).json({ user })
  } catch (error) {
    next(error)
  }
}
```

**Key principle:** Controllers handle HTTP concerns, Services handle business logic

### Step 2.3: Create Module Types

Create `src/modules/{module}/types/index.ts`:

```typescript
// Auth Module Types
export interface AuthPayload {
  id: string
  role: 'ADMIN' | 'TEACHER' | 'CREATOR' | 'NORMAL'
  subscriptionTier: 'FREE' | 'PRO' | 'ENTERPRISE'
  email: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface LoginRequest {
  email: string
  password: string
}
```

---

## Phase 3: Module Boundaries (Week 2)

### Step 3.1: Create Module Route Files

Each module's `routes/{module}.routes.ts` imports both controller AND service:

```typescript
// modules/auth/routes/auth.routes.ts

import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { AuthService } from '../services/auth.service'
import { authenticate, optionalAuth } from '../../../../shared/middlewares/auth.middleware'

const router = Router()
const service = new AuthService()
const controller = new AuthController(service)

router.post('/register', controller.register)
router.post('/login', controller.login)
router.post('/refresh', authenticate, controller.refreshToken)
router.post('/logout', authenticate, controller.logout)

export const authRoutes = router
```

### Step 3.2: Module Public API

Module index files (already created) define what other modules can import:

```typescript
// modules/auth/index.ts - What other modules see

export { authRoutes } from './routes/auth.routes'
export { authenticate, optionalAuth, requireRole, requireAdmin } from './middlewares/auth.middleware'
export { AuthService } from './services/auth.service'
export type { AuthPayload, RegisterRequest } from './types'
```

**Rule:** Other modules can ONLY import from module `index.ts`, not internal files

### Step 3.3: Cross-Module Communication

For modules that depend on each other, use service injection:

```typescript
// modules/payment/services/payment.service.ts

import { UserService } from '../../user/services/user.service'

export class PaymentService {
  constructor(private userService: UserService) {}

  async checkout(...) {
    // Can call userService methods
    const user = await this.userService.getProfile(userId)
    // But NOT access user's database directly
  }
}
```

---

## Phase 4: Event System (Optional, Week 2-3)

For modules that need to publish events that other modules listen to:

### Step 4.1: Create Event Types

```typescript
// modules/payment/events/payment.events.ts

export type PaymentEvent = 
  | { type: 'PAYMENT_COMPLETED'; payload: PaymentCompleted }
  | { type: 'SUBSCRIPTION_CREATED'; payload: SubscriptionCreated }

export interface PaymentCompleted {
  paymentId: string
  userId: string
  type: 'COURSE' | 'BOOK' | 'SUBSCRIPTION'
  entityId: string
}
```

### Step 4.2: Implement Event Emitter

```typescript
// shared/events/event-emitter.ts

type EventListener<T> = (event: T) => Promise<void>

export class EventEmitter {
  private listeners = new Map<string, EventListener<any>[]>()

  async emit<T>(eventType: string, event: T): Promise<void> {
    const eventListeners = this.listeners.get(eventType) || []
    await Promise.all(eventListeners.map(l => l(event)))
  }

  on<T>(eventType: string, listener: EventListener<T>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }
}

export const eventEmitter = new EventEmitter()
```

### Step 4.3: Module Usage

```typescript
// Payment module emits
import { eventEmitter } from '../../../../shared/events/event-emitter'

await eventEmitter.emit('PAYMENT_COMPLETED', {
  paymentId, userId, type: 'COURSE', entityId: courseId
})

// Course module listens
import { eventEmitter } from '../../../../shared/events/event-emitter'

eventEmitter.on('PAYMENT_COMPLETED', async (event) => {
  if (event.type === 'COURSE') {
    await courseService.enrollStudent(event.entityId, event.userId)
  }
})
```

---

## Phase 5: Update Server Bootstrap (Week 2)

### Step 5.1: Register Modules

```typescript
// src/server.ts

import express from 'express'
import { authenticate } from './shared/middlewares/auth.middleware'

// Import module public APIs
import * as AuthModule from './modules/auth'
import * as UserModule from './modules/user'
import * as PaymentModule from './modules/payment'
import * as CourseModule from './modules/course'
import * as ChatModule from './modules/chat'
import * as AiModule from './modules/ai'
import * as CommunityModule from './modules/community'
import * as BookModule from './modules/book'
import * as PlatformModule from './modules/platform'
import * as AdminModule from './modules/admin'

const app = express()

// Middleware
app.use(express.json())
app.use('./shared/middlewares/error.middleware')

// Public routes (no auth required)
app.use('/api/auth', AuthModule.authRoutes)

// Protected routes (auth required)
app.use(authenticate)

app.use('/api/users', UserModule.userRoutes)
app.use('/api/courses', CourseModule.courseRoutes)
app.use('/api/payments', PaymentModule.paymentRoutes)
app.use('/api/chat', ChatModule.chatRoutes)
app.use('/api/ai', AiModule.aiRoutes)
app.use('/api/communities', CommunityModule.communityRoutes)
app.use('/api/books', BookModule.bookRoutes)
app.use('/api/platforms', PlatformModule.platformRoutes)

// Admin routes
app.use('/api/admin', AdminModule.requireAdmin, AdminModule.adminRoutes)

// Error handling
app.use(ErrorHandler)

export default app
```

---

## Phase 6: Testing (Week 2-3)

### Test Structure

```
backend/
├── src/
│   └── modules/
│       └── auth/
│           ├── __tests__/
│           │   ├── auth.service.spec.ts
│           │   ├── auth.controller.spec.ts
│           │   └── auth.integration.spec.ts
│           └── ...
```

### Service Test Example

```typescript
// modules/auth/__tests__/auth.service.spec.ts

import { AuthService } from '../services/auth.service'

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    service = new AuthService()
  })

  it('should register new user', async () => {
    const user = await service.register(
      'test@example.com',
      'password123',
      'Test User'
    )
    expect(user.email).toBe('test@example.com')
  })

  it('should not register duplicate email', async () => {
    await service.register('test@example.com', 'password123', 'User 1')
    expect(() => 
      service.register('test@example.com', 'password456', 'User 2')
    ).rejects.toThrow()
  })
})
```

---

## Checklist

### Phase 1: Foundation
- [ ] Create all module directories
- [ ] Copy all controllers to modules
- [ ] Copy all routes to modules
- [ ] Update all import paths
- [ ] Build passes without errors

### Phase 2: Service Abstraction
- [ ] Create service files for each module
- [ ] Extract business logic from controllers
- [ ] Create type definitions
- [ ] Update controllers to use services
- [ ] All tests pass

### Phase 3: Module Boundaries
- [ ] Create module index.ts files (done ✅)
- [ ] Finalize route files
- [ ] Verify circular dependencies don't exist
- [ ] Document module APIs

### Phase 4: Event System (Optional)
- [ ] Create event types
- [ ] Implement event emitter
- [ ] Update modules to emit/listen to events
- [ ] Test event flow

### Phase 5: Bootstrap
- [ ] Update server.ts with module imports
- [ ] Verify all routes register correctly
- [ ] Test all endpoints
- [ ] Verify middleware chains work

### Phase 6: Testing
- [ ] Write module-level tests
- [ ] Write integration tests
- [ ] Achieve >80% coverage
- [ ] E2E tests passing

---

## Validation Commands

```bash
# Verify no circular dependencies
npm run check-dependencies

# Verify TypeScript compilation
npm run build

# Run tests
npm test

# Check code coverage
npm run coverage

# Verify imports follow rules
npm run verify-imports
```

---

## Success Criteria

✅ **Architecture:**
- 9 independent modules with clear boundaries
- 0 circular dependencies
- <5 import violations per module
- All modules follow same structure

✅ **Code Quality:**
- >80% test coverage
- All TS compilation succeeds
- ESLint passes without warnings

✅ **Performance:**
- <1.5x module load time vs monolith
- No memory overhead
- Same response times

✅ **Documentation:**
- Each module has README
- API contracts documented
- Dependency diagram exists

---

## Common Pitfalls to Avoid

❌ **Don't:** Import from module internals
```typescript
// BAD
import { AuthService } from './auth/services/auth.service'

// GOOD
import { AuthService } from './auth'
```

❌ **Don't:** Create circular dependencies
```typescript
// BAD: Payment module imports Course, Course imports Payment
// GOOD: Use event emitter instead
```

❌ **Don't:** Share databases across modules
```typescript
// BAD: CourseService directly accesses user_subscriptions table
// GOOD: UserService exposes method to check subscription
```

❌ **Don't:** Mix HTTP and business logic
```typescript
// BAD
const login = async (req, res) => {
  const user = validate(req.body)
  const hashed = hashPassword(user.password)
  const saved = await db.save(user)
  res.json(saved)
}

// GOOD
const loginService = async (email, password) => { ... }
const login = async (req, res) => {
  const result = await loginService(req.body.email, req.body.password)
  res.json(result)
}
```

---

## Next Steps

1. ✅ Architecture plan created (DONE)
2. ⏳ Phase 1: Copy files to modules
3. ⏳ Phase 2: Create services
4. ⏳ Phase 3: Finalize module boundaries
5. ⏳ Phase 4: Event system (optional)
6. ⏳ Phase 5: Update server.ts
7. ⏳ Phase 6: Write tests

**Ready to begin Phase 1?**
