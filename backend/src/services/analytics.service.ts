import { prisma } from '../server'
import { redis } from '../server'

export const analyticsService = {
  // Log user activity
  logActivity: async (userId: string, action: string, resource?: string, resourceId?: string, metadata?: any, ipAddress?: string) => {
    try {
      await prisma.activityLog.create({
        data: { userId, action, resource, resourceId, metadata, ipAddress },
      })
    } catch {}
  },

  // Platform overview stats
  getPlatformStats: async () => {
    const cacheKey = 'admin:stats'
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const [
      totalUsers, newUsersToday,
      totalCourses, publishedCourses,
      totalCommunities,
      totalMessages,
      totalRevenue,
      aiRequestsToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.course.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.community.count(),
      prisma.message.count(),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.aiMessage.count({ where: { role: 'user', createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    ])

    const onlineCount = await redis.sCard('online_users')

    const stats = {
      users: { total: totalUsers, today: newUsersToday, online: onlineCount },
      courses: { total: totalCourses, published: publishedCourses },
      communities: { total: totalCommunities },
      messages: { total: totalMessages },
      revenue: { total: totalRevenue._sum.amount || 0 },
      ai: { requestsToday: aiRequestsToday },
      generatedAt: new Date().toISOString(),
    }

    await redis.setEx(cacheKey, 60, JSON.stringify(stats))
    return stats
  },

  // User growth chart (last 30 days)
  getUserGrowth: async (days = 30) => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const byDay: Record<string, number> = {}
    users.forEach(u => {
      const key = u.createdAt.toISOString().split('T')[0]
      byDay[key] = (byDay[key] || 0) + 1
    })

    return Object.entries(byDay).map(([date, count]) => ({ date, count }))
  },

  // Revenue chart
  getRevenueChart: async (days = 30) => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: startDate } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const byDay: Record<string, number> = {}
    payments.forEach(p => {
      const key = p.createdAt.toISOString().split('T')[0]
      byDay[key] = (byDay[key] || 0) + p.amount
    })

    return Object.entries(byDay).map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
  },
}
