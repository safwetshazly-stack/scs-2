import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import { prisma } from '../server'

export const notificationRoutes = Router()
notificationRoutes.use(authenticate)

notificationRoutes.get('/', async (req, res, next) => {
  try {
    const { page = '1', limit = '20', unread } = req.query
    const skip = (+page - 1) * +limit
    const where: any = { userId: req.user!.id }
    if (unread === 'true') where.isRead = false

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: +limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ])
    res.json({ notifications, unreadCount, page: +page })
  } catch (e) { next(e) }
})

notificationRoutes.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { isRead: true } })
    res.json({ message: 'Marked as read' })
  } catch (e) { next(e) }
})

notificationRoutes.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } })
    res.json({ message: 'All marked as read' })
  } catch (e) { next(e) }
})

notificationRoutes.delete('/:id', async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user!.id } })
    res.json({ message: 'Deleted' })
  } catch (e) { next(e) }
})

notificationRoutes.get('/settings', async (req, res, next) => {
  try {
    const settings = await prisma.notificationSettings.findUnique({ where: { userId: req.user!.id } })
    res.json(settings)
  } catch (e) { next(e) }
})

notificationRoutes.patch('/settings', async (req, res, next) => {
  try {
    const settings = await prisma.notificationSettings.update({ where: { userId: req.user!.id }, data: req.body })
    res.json(settings)
  } catch (e) { next(e) }
})
