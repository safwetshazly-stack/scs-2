import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import rateLimit from 'express-rate-limit'
import hpp from 'hpp'
import { PrismaClient } from '@prisma/client'
import { createClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'

import { authRoutes } from './routes/auth.routes'
import { userRoutes } from './routes/user.routes'
import { communityRoutes } from './routes/community.routes'
import { chatRoutes } from './routes/chat.routes'
import { courseRoutes } from './routes/course.routes'
import { bookRoutes } from './routes/book.routes'
import { aiRoutes } from './routes/ai.routes'
import { paymentRoutes } from './routes/payment.routes'
import { notificationRoutes } from './routes/notification.routes'
import { adminRoutes } from './routes/admin.routes'
import { uploadRoutes } from './routes/upload.routes'
import { searchRoutes } from './routes/search.routes'
import { webhookRoutes } from './routes/webhook.routes'
import { platformRoutes } from './routes/platform.routes'

import { startVideoWorker } from './workers/video.worker'

import { socketHandler } from './utils/socket'
import { errorHandler } from './middlewares/error.middleware'
import { sanitizeInput } from './middlewares/sanitize.middleware'
import { logger } from './utils/logger'
import { env } from './config/env'

// ─── INIT ──────────────────────────────────────────────────
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

export const redis = createClient({ url: env.REDIS_URL })
export const pubClient = redis.duplicate()
export const subClient = redis.duplicate()

const app: Application = express()
const httpServer = createServer(app)

export const io = new SocketServer(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── TRUST PROXY ──────────────────────────────────────────
app.set('trust proxy', 1)

// ─── SECURITY MIDDLEWARE ──────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https:'],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}))

// ─── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [env.FRONTEND_URL, env.MOBILE_URL].filter(Boolean)
    if (!origin || allowed.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit', 'X-Total-Pages'],
  maxAge: 86400,
}))

// ─── BODY PARSING ─────────────────────────────────────────
app.use(compression())
app.use((req, res, next) => {
  // Skip raw body parsing for Stripe webhook
  if (req.originalUrl === '/api/payments/webhook') return next()
  express.json({ limit: '10mb' })(req, res, next)
})
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(hpp())
app.use(sanitizeInput)

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }))
}

// ─── RATE LIMITING ────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.ip === '127.0.0.1',
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts.' },
  skipSuccessfulRequests: true,
})

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'AI rate limit exceeded. Please wait.' },
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Upload limit exceeded.' },
})

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Search rate limit exceeded.' },
})

app.use('/api', globalLimiter)
app.use('/api/auth', authLimiter)
app.use('/api/ai', aiLimiter)
app.use('/api/upload', uploadLimiter)
app.use('/api/search', searchLimiter)

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    await redis.ping()
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: { database: 'up', redis: 'up' },
    })
  } catch (error) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() })
  }
})

// ─── API ROUTES ───────────────────────────────────────────
app.use('/api/auth',          authRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/communities',   communityRoutes)
app.use('/api/chat',          chatRoutes)
app.use('/api/courses',       courseRoutes)
app.use('/api/books',         bookRoutes)
app.use('/api/ai',            aiRoutes)
app.use('/api/payments',      paymentRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin',         adminRoutes)
app.use('/api/upload',        uploadRoutes)
app.use('/api/search',        searchRoutes)
app.use('/api/webhooks',      webhookRoutes)
app.use('/api/platforms',     platformRoutes)

// ─── 404 HANDLER ──────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', status: 404 })
})

// ─── ERROR HANDLER ────────────────────────────────────────
app.use(errorHandler)

// ─── SOCKET.IO ────────────────────────────────────────────
socketHandler(io)

// ─── BOOTSTRAP ────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect()
    logger.info('✅ Database connected')

    await redis.connect()
    await pubClient.connect()
    await subClient.connect()
    logger.info('✅ Redis connected')

    io.adapter(createAdapter(pubClient, subClient))

    // Start background workers
    startVideoWorker()

    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 SCS Platform running on port ${env.PORT} [${env.NODE_ENV}]`)
      logger.info(`   Health: http://localhost:${env.PORT}/health`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`)
  httpServer.close(async () => {
    await prisma.$disconnect()
    await redis.disconnect()
    logger.info('HTTP server closed')
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 30000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => { logger.error('Unhandled Rejection:', reason) })
process.on('uncaughtException',  (error)  => { logger.error('Uncaught Exception:', error); process.exit(1) })

bootstrap()

export { app, httpServer }
