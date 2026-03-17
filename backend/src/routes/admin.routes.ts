import { Router } from 'express'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'
import { Request, Response, NextFunction } from 'express'
import { prisma, redis } from '../server'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'

export const adminRoutes = Router()
adminRoutes.use(authenticate, requireAdmin)

// ─── PLATFORM STATS ───────────────────────────────────────
adminRoutes.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'admin:stats'
    const cached = await redis.get(cacheKey)
    if (cached) return res.json(JSON.parse(cached))

    const [
      totalUsers, newUsersToday,
      totalCourses, publishedCourses,
      totalCommunities,
      totalMessages,
      totalRevenue,
      aiRequestsToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.course.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.community.count(),
      prisma.message.count(),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.aiMessage.count({ where: { role: 'user', createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    ])

    const onlineCount = await redis.sCard('online_users')

    const stats = {
      users: { total: totalUsers, today: newUsersToday, online: onlineCount },
      courses: { total: totalCourses, published: publishedCourses },
      communities: { total: totalCommunities },
      messages: { total: totalMessages },
      revenue: { total: totalRevenue._sum.amount || 0 },
      ai: { requestsToday: aiRequestsToday },
    }

    await redis.setEx(cacheKey, 60, JSON.stringify(stats))
    res.json(stats)
  } catch (error) { next(error) }
})

// ─── USERS MANAGEMENT ─────────────────────────────────────
adminRoutes.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search, role, banned } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = {}
    if (search) where.OR = [
      { email: { contains: search as string, mode: 'insensitive' } },
      { username: { contains: search as string, mode: 'insensitive' } },
    ]
    if (role) where.role = role
    if (banned === 'true') where.isBanned = true
    if (banned === 'false') where.isBanned = false

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, email: true, role: true,
          emailVerified: true, isBanned: true, banReason: true,
          createdAt: true, lastLogin: true,
          profile: { select: { avatar: true, country: true } },
          _count: { select: { enrollments: true, coursesCreated: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    res.set('X-Total-Count', total.toString())
    res.json({ users, total })
  } catch (error) { next(error) }
})

adminRoutes.post('/users/:id/ban', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    if (!reason) throw new AppError('Ban reason is required', 400)

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: true, banReason: reason },
    })

    // Invalidate all sessions
    await prisma.userSession.updateMany({ where: { userId: id }, data: { isValid: false } })
    await redis.del(`user:${id}`)

    logger.info(`User ${id} banned by admin ${req.user!.id}. Reason: ${reason}`)
    res.json({ message: 'User banned', user })
  } catch (error) { next(error) }
})

adminRoutes.delete('/users/:id/ban', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await prisma.user.update({ where: { id }, data: { isBanned: false, banReason: null } })
    res.json({ message: 'User unbanned' })
  } catch (error) { next(error) }
})

// ─── COURSES MODERATION ───────────────────────────────────
adminRoutes.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page = '1', limit = '20' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = {}
    if (status) where.status = status

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: { select: { id: true, username: true, email: true } },
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.course.count({ where }),
    ])

    res.set('X-Total-Count', total.toString())
    res.json({ courses, total })
  } catch (error) { next(error) }
})

adminRoutes.patch('/courses/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' },
    })
    res.json(course)
  } catch (error) { next(error) }
})

adminRoutes.patch('/courses/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    })
    res.json(course)
  } catch (error) { next(error) }
})

// ─── ADS MANAGEMENT ───────────────────────────────────────
adminRoutes.get('/ads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ads = await prisma.ad.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { adImpressions: true, adClicks: true } } },
    })
    res.json(ads)
  } catch (error) { next(error) }
})

adminRoutes.post('/ads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, imageUrl, targetUrl, placement, budget, startDate, endDate } = req.body
    const ad = await prisma.ad.create({
      data: { title, imageUrl, targetUrl, placement, budget, startDate, endDate },
    })
    res.status(201).json(ad)
  } catch (error) { next(error) }
})

adminRoutes.patch('/ads/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ad = await prisma.ad.update({ where: { id: req.params.id }, data: req.body })
    res.json(ad)
  } catch (error) { next(error) }
})

// ─── SECURITY LOGS ────────────────────────────────────────
adminRoutes.get('/security-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', success } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = {}
    if (success === 'false') where.success = false

    const logs = await prisma.loginAttempt.findMany({
      where, skip, take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true, email: true } } },
    })
    res.json(logs)
  } catch (error) { next(error) }
})

// ─── AI USAGE STATS ───────────────────────────────────────
adminRoutes.get('/ai-usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalTokens, totalRequests, topUsers] = await Promise.all([
      prisma.aiUsage.aggregate({ _sum: { tokensUsed: true, requestCount: true } }),
      prisma.aiMessage.count({ where: { role: 'user' } }),
      prisma.aiUsage.findMany({
        orderBy: { tokensUsed: 'desc' },
        take: 10,
        include: { user: { select: { username: true, email: true } } },
      }),
    ])
    res.json({ totalTokens: totalTokens._sum.tokensUsed, totalRequests, topUsers })
  } catch (error) { next(error) }
})
