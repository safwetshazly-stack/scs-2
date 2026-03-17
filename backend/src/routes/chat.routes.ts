import { Router } from 'express'
import { body } from 'express-validator'
import { validate } from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'
import { prisma } from '../server'
import { AppError } from '../utils/errors'

export const chatRoutes = Router()
chatRoutes.use(authenticate)

chatRoutes.get('/conversations', async (req, res, next) => {
  try {
    const members = await prisma.conversationMember.findMany({
      where: { userId: req.user!.id },
      include: {
        conversation: {
          include: {
            members: {
              where: { userId: { not: req.user!.id } },
              include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, createdAt: true, type: true, sender: { select: { username: true } } } },
            _count: { select: { messages: true } },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    })

    const conversations = members.map(m => {
      const conv = m.conversation as any
      conv.unreadCount = 0
      return conv
    })
    res.json(conversations)
  } catch (e) { next(e) }
})

chatRoutes.post('/conversations', [body('userId').notEmpty()], validate, async (req, res, next) => {
  try {
    const { userId } = req.body
    const myId = req.user!.id
    if (userId === myId) throw new AppError('Cannot chat with yourself', 400)

    const otherUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!otherUser) throw new AppError('User not found', 404)

    const existing = await prisma.conversation.findFirst({
      where: { type: 'PRIVATE', AND: [{ members: { some: { userId: myId } } }, { members: { some: { userId } } }] },
      include: { members: { include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } } } },
    })
    if (existing) return res.json(existing)

    const conversation = await prisma.conversation.create({
      data: { type: 'PRIVATE', members: { createMany: { data: [{ userId: myId }, { userId }] } } },
      include: { members: { include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } } } },
    })
    res.status(201).json(conversation)
  } catch (e) { next(e) }
})

chatRoutes.post('/groups', [
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('memberIds').isArray({ min: 1 }),
], validate, async (req, res, next) => {
  try {
    const { name, memberIds } = req.body
    const myId = req.user!.id
    const allMembers = [myId, ...memberIds.filter((id: string) => id !== myId)]

    const conversation = await prisma.conversation.create({
      data: {
        type: 'GROUP', name,
        members: { createMany: { data: allMembers.map((userId: string) => ({ userId, isAdmin: userId === myId })) } },
      },
      include: { members: { include: { user: { select: { id: true, username: true, profile: { select: { avatar: true } } } } } } },
    })
    res.status(201).json(conversation)
  } catch (e) { next(e) }
})

chatRoutes.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params
    const { before, limit = '50' } = req.query
    const member = await prisma.conversationMember.findFirst({ where: { conversationId: id, userId: req.user!.id } })
    if (!member) throw new AppError('Not a member', 403)

    const messages = await prisma.message.findMany({
      where: { conversationId: id, deletedAt: null, ...(before ? { createdAt: { lt: new Date(before as string) } } : {}) },
      take: +limit, orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
        replyTo: { select: { id: true, content: true, sender: { select: { username: true } } } },
        reactions: { include: { user: { select: { id: true, username: true } } } },
        attachments: true,
        reads: { select: { userId: true } },
      },
    })

    // Mark messages as read
    await prisma.conversationMember.updateMany({
      where: { conversationId: id, userId: req.user!.id },
      data: { lastReadAt: new Date() },
    })

    res.json(messages.reverse())
  } catch (e) { next(e) }
})

chatRoutes.delete('/conversations/:conversationId/messages/:messageId', async (req, res, next) => {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.messageId, conversationId: req.params.conversationId, senderId: req.user!.id },
    })
    if (!message) throw new AppError('Message not found', 404)
    await prisma.message.update({ where: { id: req.params.messageId }, data: { deletedAt: new Date(), content: 'This message was deleted' } })
    res.json({ message: 'Deleted' })
  } catch (e) { next(e) }
})
