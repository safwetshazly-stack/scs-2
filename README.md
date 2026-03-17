# SCS Platform — منصة التعلم الاجتماعية المتكاملة

> **منصة تعليمية اجتماعية** تجمع الكورسات، المجتمعات، الدردشة الفورية، والذكاء الاصطناعي في مكان واحد.

---

## جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [المميزات الرئيسية](#المميزات-الرئيسية)
3. [هيكل المشروع](#هيكل-المشروع)
4. [Stack التقني](#stack-التقني)
5. [تشغيل سريع](#تشغيل-سريع)
6. [إعداد Docker](#إعداد-docker)
7. [قاعدة البيانات](#قاعدة-البيانات)
8. [API Endpoints](#api-endpoints)
9. [الأمان](#الأمان)
10. [نظام الذكاء الاصطناعي](#نظام-الذكاء-الاصطناعي)
11. [Socket.IO Events](#socketio-events)
12. [المتغيرات البيئية](#المتغيرات-البيئية)
13. [خارطة الطريق](#خارطة-الطريق)

---

## نظرة عامة

SCS Platform هي منصة تعليمية اجتماعية متكاملة، مبنية على معمارية قابلة للتوسع من 1,000 إلى 1,000,000 مستخدم. تجمع ما تقدمه منصات عالمية في مكان واحد:

- **Udemy** — سوق الكورسات والكتب
- **Discord** — مجتمعات وقنوات تفاعلية فورية
- **WhatsApp** — دردشة خاصة وجماعية
- **ChatGPT** — ذكاء اصطناعي متعدد النماذج تحت اسم SCS AI

### بيانات الدخول التجريبية

```
Admin:      admin@scsplatform.com      / Admin@123456
Instructor: instructor@scsplatform.com / Demo@123456
```

---

## المميزات الرئيسية

### نظام الحسابات
- تسجيل وتسجيل دخول آمن مع JWT (Access 15م + Refresh 30ي)
- التحقق من البريد الإلكتروني عبر رابط آمن
- إعادة تعيين كلمة المرور (صلاحية ساعة)
- إدارة الجلسات المتعددة من أجهزة مختلفة
- نظام متابعة / إلغاء متابعة
- حظر المستخدمين
- ملف شخصي كامل (مهارات، جامعة، تخصص، روابط)

### المجتمعات
- إنشاء وإدارة المجتمعات (عامة / خاصة)
- قنوات متعددة: نصية، إعلانات، ملفات
- أدوار: مالك، مشرف، عضو
- روابط دعوة قابلة للتخصيص
- رسائل القنوات بالوقت الفعلي

### الدردشة الفورية
- رسائل خاصة بين مستخدمين
- مجموعات دردشة
- مؤشر الكتابة في الوقت الفعلي
- إشعارات القراءة
- الرد على رسائل محددة
- تفاعلات بالإيموجي
- إرسال ملفات وصور

### سوق الكورسات
- إنشاء كورسات بـ Modules و Lessons
- رفع فيديوهات الدروس
- تتبع تقدم الطالب (lesson-by-lesson)
- تقييمات ومراجعات
- مستويات (مبتدئ / متوسط / متقدم)
- دعم عدة لغات
- نشر يتطلب موافقة الإدارة

### سوق الكتب
- رفع وبيع الكتب الرقمية (PDF/EPUB)
- مكتبة شخصية
- تحميل مباشر بعد الشراء
- تقييم الكتب

### SCS AI
- دردشة ذكية مع تاريخ المحادثات
- Streaming للردود (كلمة بكلمة)
- توجيه ذكي بين GPT-4 وClaude وDeepSeek
- تلخيص نصوص وكتب
- شرح وإنشاء كود
- ترجمة وإعادة صياغة
- حدود استخدام حسب الاشتراك
- حماية من Prompt Injection

### المدفوعات (Stripe)
- شراء الكورسات والكتب
- اشتراكات (Free / Pro $9.99 / Team $29.99)
- Webhooks للتأكيد الآمن
- سجل مدفوعات

### الإشعارات
- إشعارات Socket.IO الفورية
- بريد HTML احترافي
- إعدادات تحكم لكل نوع

### لوحة الإدارة
- إحصائيات المنصة الكاملة
- إدارة وحظر المستخدمين
- مراجعة ونشر الكورسات
- إدارة الإعلانات
- سجلات الأمان (محاولات الاختراق)
- مراقبة استخدام AI

---

## هيكل المشروع

```
scs-platform/
├── frontend/                          # Next.js 14
│   └── src/
│       ├── app/
│       │   ├── auth/
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   ├── forgot-password/page.tsx
│       │   │   ├── reset-password/page.tsx
│       │   │   └── verify-email/page.tsx
│       │   ├── main/                  # Protected
│       │   │   ├── layout.tsx         # Sidebar + Header
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── communities/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [slug]/page.tsx
│       │   │   ├── chat/page.tsx
│       │   │   ├── courses/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [slug]/page.tsx
│       │   │   ├── books/page.tsx
│       │   │   ├── ai/page.tsx
│       │   │   ├── profile/[username]/page.tsx
│       │   │   └── settings/page.tsx
│       │   ├── admin/page.tsx
│       │   ├── layout.tsx             # Root
│       │   └── page.tsx               # Landing
│       ├── components/
│       │   ├── layout/Navbar.tsx
│       │   ├── layout/Footer.tsx
│       │   ├── sections/              # Landing sections
│       │   └── providers/index.tsx    # Query + Socket
│       ├── services/api.ts            # Axios + all calls
│       ├── store/
│       │   ├── auth.store.ts
│       │   └── notification.store.ts
│       ├── lib/utils.ts
│       └── styles/globals.css
│
├── backend/                           # Express + TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── community.controller.ts
│   │   │   ├── course.controller.ts
│   │   │   ├── book.controller.ts
│   │   │   ├── ai.controller.ts
│   │   │   └── payment.controller.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── community.routes.ts
│   │   │   ├── chat.routes.ts
│   │   │   ├── course.routes.ts
│   │   │   ├── book.routes.ts
│   │   │   ├── ai.routes.ts
│   │   │   ├── payment.routes.ts
│   │   │   ├── notification.routes.ts
│   │   │   ├── upload.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # JWT + CSRF + roles
│   │   │   ├── error.middleware.ts
│   │   │   ├── sanitize.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── services/
│   │   │   └── ai.service.ts          # Multi-model router
│   │   ├── utils/
│   │   │   ├── socket.ts
│   │   │   ├── email.ts
│   │   │   ├── jwt.ts
│   │   │   ├── logger.ts
│   │   │   ├── errors.ts
│   │   │   └── slugify.ts
│   │   ├── config/env.ts
│   │   └── server.ts
│   └── prisma/
│       ├── schema.prisma              # 40+ tables
│       └── seed.ts
│
├── nginx/nginx.conf                   # Reverse proxy + SSL
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Stack التقني

### Frontend

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| Next.js | 14.2 | React Framework + App Router + SSR |
| TypeScript | 5.4 | Static typing |
| Tailwind CSS | 3.4 | Styling + Design System |
| Framer Motion | 11 | Animations |
| TanStack Query | 5 | Server state + caching |
| Zustand | 4.5 | Client state |
| Socket.IO Client | 4.7 | Real-time |
| React Hook Form | 7 | Forms |
| Zod | 3.23 | Validation |
| Axios | 1.7 | HTTP + interceptors |

### Backend

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| Express.js | 4.19 | HTTP Server |
| TypeScript | 5.4 | Static typing |
| Prisma ORM | 5.16 | Database + migrations |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | Cache + sessions |
| Socket.IO | 4.7 | WebSocket |
| JWT | 9 | Auth tokens |
| bcryptjs | 2.4 | Password hashing |
| Stripe SDK | 16 | Payments |
| Multer + S3 | — | File uploads |
| Nodemailer | 6.9 | Email |
| Helmet | 7.1 | Security headers |
| Winston | 3.13 | Logging |

---

## تشغيل سريع

### المتطلبات

```
Node.js >= 20
PostgreSQL >= 16
Redis >= 7
```

### 1. إعداد المتغيرات

```bash
cp .env.example .env
# عدّل .env بقيمك
```

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed          # بيانات تجريبية
npm run dev                  # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

---

## إعداد Docker

```bash
# 1. إعداد env
cp .env.example .env

# 2. بناء + تشغيل
docker compose up -d --build

# 3. تهيئة قاعدة البيانات
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed

# 4. التحقق
docker compose ps

# أوامر مفيدة
docker compose logs -f backend
docker compose exec backend sh
docker compose down
```

### الخدمات

| الخدمة | المنفذ |
|--------|-------|
| nginx | 80, 443 |
| frontend | 3000 |
| backend | 4000 |
| postgres | 5432 |
| redis | 6379 |

---

## قاعدة البيانات

### الجداول (40+)

**المستخدمون:** users, user_profiles, user_settings, user_sessions, email_verifications, password_resets, follows, blocked_users

**المجتمعات:** communities, community_members, community_channels, channel_messages, community_invites

**الرسائل:** conversations, conversation_members, messages, message_reactions, message_attachments, message_reads

**المنشورات:** posts, post_comments, post_likes, post_tags

**الكورسات:** courses, course_modules, course_lessons, course_enrollments, lesson_progress, course_reviews

**الكتب:** books, book_purchases, book_reviews

**المدفوعات:** payments, transactions, orders, subscription_plans, user_subscriptions

**الذكاء الاصطناعي:** ai_conversations, ai_messages, ai_usage

**الإعلانات:** ads, ad_impressions, ad_clicks

**الأمان:** login_attempts, activity_logs, api_keys, reports

**النظام:** notifications, bookmarks, search_history, support_tickets, system_settings, feature_flags

### Prisma Commands

```bash
# تطوير
npx prisma migrate dev --name feature_name

# إنتاج
npx prisma migrate deploy

# Prisma Studio
npx prisma studio
```

---

## API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login               → {accessToken, refreshToken, user}
POST /api/auth/refresh
POST /api/auth/logout              [Auth]
GET  /api/auth/verify-email/:token
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me                  [Auth]
```

### Users
```
GET    /api/users/search
GET    /api/users/:username
GET    /api/users/:username/followers
GET    /api/users/:username/following
PATCH  /api/users/profile          [Auth]
PATCH  /api/users/settings         [Auth]
POST   /api/users/:id/follow       [Auth]
DELETE /api/users/:id/follow       [Auth]
POST   /api/users/:id/block        [Auth]
GET    /api/users/sessions         [Auth]
DELETE /api/users/sessions/:id     [Auth]
POST   /api/users/bookmarks        [Auth]
GET    /api/users/bookmarks        [Auth]
```

### Communities
```
GET    /api/communities
GET    /api/communities/:slug
POST   /api/communities            [Auth]
PATCH  /api/communities/:id        [Auth]
DELETE /api/communities/:id        [Auth]
POST   /api/communities/:id/join   [Auth]
DELETE /api/communities/:id/leave  [Auth]
GET    /api/communities/:id/members
GET    /api/communities/:id/channels           [Auth]
POST   /api/communities/:id/channels           [Auth]
GET    /api/communities/channels/:id/messages  [Auth]
```

### Chat
```
GET    /api/chat/conversations            [Auth]
POST   /api/chat/conversations            [Auth]
POST   /api/chat/groups                   [Auth]
GET    /api/chat/conversations/:id/messages [Auth]
DELETE /api/chat/conversations/:cId/messages/:mId [Auth]
```

### Courses
```
GET    /api/courses
GET    /api/courses/:slug
GET    /api/courses/instructor/mine        [Instructor]
POST   /api/courses                        [Instructor]
PATCH  /api/courses/:id                    [Instructor]
DELETE /api/courses/:id                    [Instructor]
POST   /api/courses/:id/enroll             [Auth]
POST   /api/courses/:id/publish            [Instructor]
POST   /api/courses/:id/modules            [Instructor]
POST   /api/courses/modules/:id/lessons    [Instructor]
POST   /api/courses/lessons/:id/progress   [Auth]
POST   /api/courses/:id/reviews            [Auth]
```

### Books
```
GET    /api/books
GET    /api/books/:slug
GET    /api/books/library                 [Auth]
POST   /api/books                         [Auth]
PATCH  /api/books/:id                     [Auth]
POST   /api/books/:id/purchase            [Auth]
POST   /api/books/:id/reviews             [Auth]
```

### AI
```
GET    /api/ai/conversations              [Auth]
POST   /api/ai/conversations              [Auth]
GET    /api/ai/conversations/:id/messages [Auth]
POST   /api/ai/conversations/:id/messages [Auth]
POST   /api/ai/conversations/:id/stream   [Auth]
DELETE /api/ai/conversations/:id          [Auth]
GET    /api/ai/usage                      [Auth]
```

### Payments
```
GET    /api/payments/plans
POST   /api/payments/checkout             [Auth]
POST   /api/payments/webhook              (Stripe)
GET    /api/payments/history              [Auth]
GET    /api/payments/subscription         [Auth]
DELETE /api/payments/subscription         [Auth]
```

### Notifications
```
GET    /api/notifications                 [Auth]
PATCH  /api/notifications/:id/read        [Auth]
PATCH  /api/notifications/read-all        [Auth]
DELETE /api/notifications/:id             [Auth]
GET    /api/notifications/settings        [Auth]
PATCH  /api/notifications/settings        [Auth]
```

### Upload
```
POST   /api/upload/avatar                 [Auth] — max 5MB
POST   /api/upload/cover                  [Auth] — max 10MB
POST   /api/upload/message                [Auth] — max 20MB
POST   /api/upload/video                  [Instructor] — max 500MB
POST   /api/upload/book                   [Auth] — max 100MB
POST   /api/upload/ai-file                [Auth] — max 20MB
```

### Admin
```
GET    /api/admin/stats                   [Admin]
GET    /api/admin/users                   [Admin]
POST   /api/admin/users/:id/ban           [Admin]
DELETE /api/admin/users/:id/ban           [Admin]
GET    /api/admin/courses                 [Admin]
PATCH  /api/admin/courses/:id/approve     [Admin]
PATCH  /api/admin/courses/:id/reject      [Admin]
GET    /api/admin/ads                     [Admin]
POST   /api/admin/ads                     [Admin]
PATCH  /api/admin/ads/:id                 [Admin]
GET    /api/admin/security-logs           [Admin]
GET    /api/admin/ai-usage                [Admin]
```

---

## الأمان

### طبقات الحماية

**Nginx Layer:**
- Rate Limiting: 60 طلب/دقيقة global، 10 طلب/دقيقة للـ auth
- Security Headers: HSTS, X-Frame-Options, X-Content-Type-Options
- SSL/TLS: TLSv1.2 فقط مع أقوى cipher suites
- حجب Scanner bots: nmap, sqlmap, nikto, masscan

**Express Layer:**
- Helmet: 15+ security headers
- CORS: Origin whitelist مع credentials
- HPP: منع HTTP Parameter Pollution
- Input Sanitization: XSS cleaning على كل المدخلات
- Request Size Limit: 10MB

**Auth Layer:**
- JWT Access Token: 15 دقيقة
- JWT Refresh Token: 30 يوم مع token rotation
- Token Blacklisting في Redis
- CSRF Validation: Origin header check
- Role-based Access: USER / INSTRUCTOR / ADMIN

**Brute Force Protection:**
- تتبع محاولات الدخول في Redis
- قفل الحساب 15 دقيقة بعد 5 محاولات فاشلة
- تسجيل كل المحاولات في قاعدة البيانات

**File Upload Security:**
- التحقق من MIME type
- حجب الامتدادات الخطرة: .exe, .php, .js, .sh, .bat
- حدود حجم لكل نوع
- Memory storage (لا disk مباشر)
- تشفير S3 بـ AES-256

**AI Security:**
- فلترة Prompt Injection patterns
- حدود استخدام شهرية حسب الخطة
- لا يُكشف System Prompt

### حدود Rate Limiting

| النوع | الحد | النافذة |
|-------|------|---------|
| Global API | 200 | 15 دقيقة |
| Auth endpoints | 10 | 15 دقيقة |
| AI endpoints | 20 | دقيقة |
| Upload | 50 | ساعة |
| Login lock | 5 فاشلة | قفل 15 دق |

---

## نظام الذكاء الاصطناعي

### Model Router

```
code        → DeepSeek
analysis    → Claude 3.5 Sonnet
translation → GPT-4 Turbo
summary     → Claude 3.5 Sonnet
creative    → GPT-4 Turbo
chat        → Claude 3.5 Sonnet (default)
```

### حدود الاستخدام

| الخطة | رموز/شهر | السعر |
|-------|---------|-------|
| Free | 50,000 | مجاني |
| Pro | 500,000 | $9.99/شهر |
| Team | 2,000,000 | $29.99/شهر |

### Streaming Example

```javascript
const res = await fetch('/api/ai/conversations/:id/stream', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'لخص هذا الكتاب' }),
})
const reader = res.body.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const text = new TextDecoder().decode(value)
  // parse SSE: data: {"chunk":"..."}
}
```

---

## Socket.IO Events

### Client → Server

```javascript
// رسالة
socket.emit('message:send', { conversationId, content, type?, replyToId? })

// كتابة
socket.emit('typing:start', { conversationId })
socket.emit('typing:stop', { conversationId })

// قراءة
socket.emit('message:read', { messageId, conversationId })

// تفاعل
socket.emit('reaction:add', { messageId, emoji, conversationId })

// قناة مجتمع
socket.emit('channel:message', { channelId, communityId, content })

// حضور
socket.emit('ping:presence')
```

### Server → Client

```javascript
socket.on('message:new', (message) => {})
socket.on('typing:start', ({ userId, conversationId }) => {})
socket.on('typing:stop', ({ conversationId }) => {})
socket.on('message:read', ({ messageId, userId }) => {})
socket.on('reaction:added', ({ messageId, userId, emoji }) => {})
socket.on('channel:message', ({ channelId, message }) => {})
socket.on('user:online', ({ userId, online }) => {})
```

---

## المتغيرات البيئية

```bash
# App
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/scs_db

# Redis
REDIS_URL=redis://:password@localhost:6379

# JWT (توليد: openssl rand -base64 64)
JWT_ACCESS_SECRET=64-char-secret
JWT_REFRESH_SECRET=other-64-char-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3
AWS_ACCESS_KEY=AKIA...
AWS_SECRET_KEY=...
AWS_REGION=us-east-1
AWS_BUCKET=scs-platform-files

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=app-password
EMAIL_FROM=SCS Platform <noreply@yourdomain.com>

# Frontend
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_WS_URL=https://yourdomain.com
```

---

## خارطة الطريق

### المرحلة الحالية (MVP)
- نظام حسابات كامل + JWT
- مجتمعات مع قنوات
- دردشة فورية Socket.IO
- SCS AI (GPT-4 + Claude + DeepSeek)
- سوق كورسات + كتب
- مدفوعات Stripe
- رفع ملفات S3
- لوحة إدارة
- أمان متعدد الطبقات

### المرحلة القادمة
- تطبيق جوال React Native
- OAuth (Google / GitHub / Apple)
- شهادات معتمدة
- Gamification (نقاط + شارات + Leaderboard)
- Live Classes (WebRTC)
- دعم لغات: EN / FR / ES

### المرحلة المستقبلية
- Microservices Architecture
- Kubernetes Deployment
- ElasticSearch
- شراكات جامعية
- سوق خدمات فريلانس

---

## الترخيص

MIT License — انظر ملف LICENSE

---

صُنع بـ ❤️ للطلاب العرب | SCS Platform
