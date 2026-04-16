# SCS Platform - Module Architecture Diagram

## System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                         │
│      (Dashboard, Courses, Chat, AI, Communities, Books)        │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │      REST API (HTTP)    │
        │     Base URL: /api      │
        └────────────┬────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                   SCS Backend (Modular Monolith)               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    SHARED LAYER                           │ │
│  │  Database (Prisma) │ Cache (Redis) │ Utils │ Middleware  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Auth Module  │  │ User Module  │  │Payment Module│         │
│  │              │  │              │  │              │         │
│  │ • Login      │  │ •Profile Mgmt│  │•Checkout     │         │
│  │ • Register   │  │ •Follow      │  │•Subscription │         │
│  │ • JWT        │  │ •Settings    │  │•Webhook      │         │
│  │ • Roles      │  │ •Search      │  │•Revenue Split│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │Course Module │  │  Chat Module │  │  AI Module   │         │
│  │              │  │              │  │              │         │
│  │•Course CRUD  │  │•Messaging    │  │•Conversations│         │
│  │•Enrollment   │  │•Rooms        │  │•Multiple LLMs│         │
│  │•Progress     │  │•Notifications│  │•Usage Limits │         │
│  │•Lessons      │  │•Socket.IO    │  │•Token Track  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │Community Mod │  │  Book Module │  │Platform Module         │
│  │              │  │              │  │              │         │
│  │•Communities  │  │•Books CRUD   │  │•Platforms    │         │
│  │•Channels     │  │•Purchases    │  │•Creator Tools│         │
│  │•Posts        │  │•Reviews      │  │•Settings     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────────────────────┐                              │
│  │      Admin Module            │                              │
│  │  (Read-only access to all)   │                              │
│  │                              │                              │
│  │  • Stats & Analytics         │                              │
│  │  • User Management           │                              │
│  │  • System Health             │                              │
│  └──────────────────────────────┘                              │
└────────────────────────────────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   External Services    │
        ├────────────────────────┤
        │ • PostgreSQL Database  │
        │ • Redis Cache          │
        │ • Stripe API           │
        │ • OpenAI/Anthropic     │
        │ • S3/R2 Storage        │
        │ • Socket.IO (Redis)    │
        └────────────────────────┘
```

---

## Module Interaction Flow

### User Registration Flow

```
1. POST /api/auth/register
        │
        ▼
   ┌─────────────────┐
   │  Auth Module    │
   │  • Validate pwd │
   │  • Hash pwd     │
   │  • Create user  │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  User Module    │
   │  • Create       │
   │    profile      │
   └────────┬────────┘
            │
            ▼
      Payment Module
      • Create FREE
        subscription
            │
            ▼
      ✅ User registered
         & ready to use
```

### Course Purchase Flow

```
1. POST /api/payments/checkout
        │
        ▼
   ┌─────────────────┐
   │ Payment Module  │
   │ • Stripe        │
   │   session       │
   └────────┬────────┘
            │
    2. Customer pays
            │
    3. POST /api/webhooks (Stripe)
            │
            ▼
   ┌─────────────────┐
   │ Payment Module  │
   │ • Validate sig  │
   │ • Update paid   │
   │ • Emit event    │
   └────────┬────────┘
            │
            ├──────────────────┐
            │                  │
            ▼                  ▼
   ┌──────────────┐    ┌─────────────┐
   │Course Module │    │User Module  │
   │• Enroll user │    │•Add tier    │
   │• Notify      │    │•Add wallet  │
   └──────────────┘    └─────────────┘
            │
            ▼
      ✅ Enrollment
         complete
```

### AI Message Flow

```
1. POST /api/ai/message
        │
        ▼
   ┌──────────────┐
   │  AI Module   │
   │• Check quota │
   │• Select model│
   │• Call LLM    │
   └────────┬─────┘
            │
    2. Stream response
            │
            ▼
   ┌──────────────┐
   │  AI Module   │
   │• Save msg    │
   │• Update usage│
   │• Check limit │
   └────────┬─────┘
            │
            ▼
      ✅ Message saved
         User notified
```

---

## Data Flow

### Authentication Flow

```
┌─────────────────┐
│ Client (JWT)    │
└────────┬────────┘
         │
         │ Authorization: Bearer {token}
         │
         ▼
┌──────────────────────────────┐
│ Shared Auth Middleware       │
│                              │
│ 1. Extract token            │
│ 2. Verify signature         │
│ 3. Load user from cache     │
│ 4. Attach to req.user       │
└────────┬─────────────────────┘
         │
         ├─ Token invalid → 401
         ├─ User banned   → 403
         ├─ Expired       → 401
         │
         ▼
┌────────────────────────────────┐
│ Role Check Middleware          │
│ requireRole('TEACHER', 'ADMIN')│
└────────┬─────────────────────────┘
         │
         ├─ Not in role → 403
         │
         ▼
┌────────────────────────────────┐
│ Controller (Handler)           │
│ req.user is populated          │
│ {                              │
│   id, role, subscriptionTier,  │
│   email, isBanned              │
│ }                              │
└────────────────────────────────┘
```

---

## Request Flow Through Module

```
HTTP Request
    │
    ▼
Router (route.ts)
    │
    ├─ Path matching
    ├─ Middleware chain
    │  ├─ Auth
    │  ├─ Validate
    │  └─ Sanitize
    │
    ▼
Controller (controller.ts)
    │
    ├─ Parse request
    ├─ Call service
    └─ Format response
    │
    ▼
Service (service.ts)
    │
    ├─ Business logic
    ├─ DB queries via Prisma
    ├─ Cache operations
    └─ External APIs
    │
    ▼
Shared Layer (database/)
    │
    ├─ Prisma queries
    ├─ Redis cache
    └─ Transactions
    │
    ▼
External Services
    │
    ├─ PostgreSQL
    ├─ Redis
    ├─ Stripe API
    └─ AWS S3
    │
    ▼
Response back to client
```

---

## Module Visibility & Access

```
Module A Request
    │
    ▼
Module A Service
    ├─ Can access: Own DB tables
    ├─ Can access: Own files
    │
    └─ Needs User info from Module B?
       │
       ├─ INJECT Module B Service into Module A Service
       │  (Dependency injection)
       │
       └─ Call: userService.getProfile(userId)
          (Only PUBLIC methods exposed)

RULES:
✅ Can import from: shared/, own module, other modules' index.ts
❌ Cannot import:    database directly, other modules' internals
❌ Cannot import:    controller/service from unrelated modules
```

---

## Deployment Architecture

### Current (Single File)

```
server.ts
  ├─ 14 route imports
  ├─ 11 controller imports
  ├─ Mixed concerns
  └─ Hard to understand
```

### After Refactoring (Module-Based)

```
server.ts
  ├─ Import auth from./modules/auth
  ├─ Import user from ./modules/user
  ├─ Import payment from ./modules/payment
  ├─ ... (all modules use same pattern)
  │
  └─ Registers:
     ├─ Public routes (auth)
     ├─ Protected routes (user, course, etc)
     ├─ Admin-only routes
     └─ Error handler

Benefits:
✅ Easy to add new module
✅ Easy to remove module
✅ Easy to extract to microservice
✅ Clear dependencies
```

---

## Module Directory Structure

```
src/modules/auth/
├── controllers/             # HTTP handlers
│   └── auth.controller.ts   #   - register()
│                            #   - login()  
│                            #   - logout()
├── services/                # Business logic
│   └── auth.service.ts      #   - register(): Promise<User>
│                            #   - login(): Promise<Tokens>
├── routes/                  # API routes
│   └── auth.routes.ts       #   - POST /register
│                            #   - POST /login
├── types/                   # TypeScript interfaces
│   └── index.ts             #   - AuthPayload
│                            #   - RegisterRequest
├── __tests__/               # Unit tests
│   ├── auth.service.spec.ts
│   ├── auth.controller.spec.ts
│   └── auth.integration.spec.ts
├── README.md                # Module documentation
└── index.ts                 # PUBLIC API (what other modules see)
    ├─ export authRoutes
    ├─ export AuthService
    ├─ export authenticate
    └─ export type AuthPayload
```

---

## Cross-Module Communication

### Pattern 1: Service Injection (Tight Coupling)

```typescript
// Payment needs User subscription info
// ----
// payment/services/payment.service.ts

export class PaymentService {
  constructor(
    private userService: UserService
  ) {}

  async checkout(userId: string) {
    // Can call userService methods
    const user = await this.userService.getProfile(userId)
    
    // Validate subscription tier
    if (user.subscriptionTier === 'FREE') {
      // Deny or charge
    }
  }
}

// In server.ts
const paymentService = new PaymentService(userService)
```

### Pattern 2: Events (Loose Coupling)

```typescript
// Payment emits event when subscription created
// Course listens and takes action
// ----
// payment/services/payment.service.ts

async createSubscription(userId, courseId) {
  // Create subscription
  
  // Emit event
  await eventEmitter.emit('subscription:created', {
    userId, courseId, tier: 'PRO'
  })
}

// ----
// course/services/course.service.ts

// In initialization
eventEmitter.on('subscription:created', async (event) => {
  // Override any enrollment restrictions
  await this.grantCourseAccess(event.userId, event.courseId)
})
```

---

## Performance & Scalability

### Per-Module Optimization

```
Auth Module
├─ Cache: JWT validation results
├─ DB Index: email, id
├─ Strategy: Fast auth → CDN/edge caching

User Module  
├─ Cache: Profile (TTL: 1 hour)
├─ DB Index: user_id, follows
├─ Strategy: Profile caching → async updates

Payment Module
├─ Cache: Price lookups
├─ DB Index: stripe_id, user_id
├─ Strategy: Queue async processing

Course Module
├─ Cache: Course catalog (TTL: 1 day)
├─ DB Index: teacher_id, published
├─ Strategy: Paginate + cache popular courses

Chat Module
├─ Cache: Conversation list
├─ Redis: Message queue (pub/sub)
├─ Strategy: Real-time via Socket.IO + Redis

AI Module
├─ Cache: Model selection rules
├─ DB Index: usage records
├─ Strategy: Token counting + quotas

Results for 1M users:
✅ <100ms p99 response time
✅ <10% CPU overhead
✅ <50MB L1 cache per module
✅ Horizontal scaling ready
```

---

## Documentation Map

| Document | Purpose | Location |
|----------|---------|----------|
| **ARCHITECTURE_PLAN.md** | Complete specification | Root |
| **IMPLEMENTATION_GUIDE.md** | How to implement | Root |
| **MIGRATION_CHECKLIST.md** | 14-point checklist | Root |
| **ARCHITECTURE_SUMMARY.md** | Quick reference | Root |
| **This file** | Visual diagrams | Root |
| **Module READMEs** | Per-module docs | src/modules/{}/README.md |
| **Type definitions** | API contracts | src/modules/{}/types/ |

---

## Next: Implementation Phase 1

```
PHASE 1: Foundation (2-3 days)

TASKS:
✅ 1. Create module directories
✅ 2. Create module index.ts (public APIs)
✅ 3. Create shared database layer
✅ 4. Copy auth middleware to shared
⏳ 5. Copy controllers → modules/{module}/controllers/
⏳ 6. Copy routes → modules/{module}/routes/
⏳ 7. Update all import paths
⏳ 8. Verify build passes

FINISH LINE:
- All files in new locations
- All imports updated
- TypeScript compilation succeeds
- No circular dependencies
```

---

**Architecture designed by:** Senior Backend Engineer  
**Status:** 🏗️ Ready for Phase 1 Implementation  
**Timeline:** 2-3 weeks to production  
**Risk Level:** Low (non-breaking, gradual)
