import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from '../shared/database/prisma'
import { redis } from '../shared/database/redis'
import { env } from '../config/env'
import { logger } from './logger'

interface AuthSocket extends Socket {
  userId?: string
  username?: string
}

// ─── SOCKET AUTH ──────────────────────────────────────────
async function authenticateSocket(socket: AuthSocket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
    if (!token) return next(new Error('Authentication required'))

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, isBanned: true },
    })

    if (!user || user.isBanned) return next(new Error('Unauthorized'))

    socket.userId = user.id
    socket.username = user.username
    next()
  } catch {
    next(new Error('Invalid token'))
  }
}

// ─── RATE LIMIT HELPER ────────────────────────────────────
async function checkSocketRateLimit(userId: string, event: string, limit = 10, window = 10): Promise<boolean> {
  const key = `socket_rl:${userId}:${event}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, window)
  return count <= limit
}

// ─── MAIN SOCKET HANDLER ──────────────────────────────────
export function socketHandler(io: Server) {
  io.use(authenticateSocket)

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!
    logger.info(`Socket connected: ${userId}`)

    // Mark user online
    await redis.setEx(`online:${userId}`, 300, '1')
    await redis.sAdd('online_users', userId)

    // Join personal room
    socket.join(`user:${userId}`)

    // Join user's conversations
    const conversations = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    })
    conversations.forEach(({ conversationId }) => socket.join(`conv:${conversationId}`))

    // Join user's communities
    const memberships = await prisma.communityMember.findMany({
      where: { userId },
      select: { communityId: true },
    })
    memberships.forEach(({ communityId }) => socket.join(`community:${communityId}`))

    // Broadcast online status
    io.emit('user:online', { userId, online: true })

    // ─── MESSAGE EVENTS ────────────────────────────────
    socket.on('message:send', async (data: {
      conversationId: string
      content: string
      type?: string
      replyToId?: string
      isEphemeral?: boolean
    }) => {
      try {
        if (!await checkSocketRateLimit(userId, 'message', 30, 10)) {
          socket.emit('error', { message: 'Sending messages too fast' })
          return
        }

        const { conversationId, content, type = 'TEXT', replyToId, isEphemeral = false } = data

        // Verify membership
        const member = await prisma.conversationMember.findFirst({
          where: { conversationId, userId },
        })
        if (!member) {
          socket.emit('error', { message: 'Not a member of this conversation' })
          return
        }

        // Sanitize content
        const sanitized = content.trim().slice(0, 5000)
        if (!sanitized) return

        const expiresAt = isEphemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null // 24hr expiry

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content: sanitized,
            type: type as any,
            replyToId,
            isEphemeral,
            expiresAt
          },
          include: {
            sender: {
              select: { id: true, username: true, profile: { select: { avatar: true } } },
            },
            replyTo: {
              select: { id: true, content: true, sender: { select: { username: true } } },
            },
            attachments: true,
          },
        })

        // Broadcast to conversation room
        io.to(`conv:${conversationId}`).emit('message:new', message)

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        })

        // Webhook Mentions Tracker Logic
        const mentions = sanitized.match(/@([a-zA-Z0-9_]+)/g)
        const mentionedUserIds = new Set<string>()

        if (mentions) {
          const usernames = mentions.map(m => m.substring(1))
          const mentionedUsers = await prisma.user.findMany({
            where: { username: { in: usernames } },
            select: { id: true, username: true }
          })
          
          for (const mu of mentionedUsers) {
            if (mu.id !== userId) {
              mentionedUserIds.add(mu.id)
              await prisma.notification.create({
                data: {
                  userId: mu.id,
                  type: 'MESSAGE', // Map mapped to enum type in Database
                  title: 'New Mention',
                  body: `${socket.username} mentioned you: ${sanitized.slice(0, 40)}...`,
                  data: { conversationId },
                }
              })
            }
          }
        }

        // Notify offline members
        const members = await prisma.conversationMember.findMany({
          where: { conversationId, userId: { not: userId } },
          select: { userId: true },
        })

        for (const m of members) {
          if (mentionedUserIds.has(m.userId)) continue // Skip if already notified via mention
          
          const isOnline = await redis.get(`online:${m.userId}`)
          if (!isOnline && !isEphemeral) {
            await prisma.notification.create({
              data: {
                userId: m.userId,
                type: 'MESSAGE',
                title: 'New message',
                body: `${socket.username}: ${sanitized.slice(0, 60)}`,
                data: { conversationId },
              },
            })
          }
        }
      } catch (err) {
        logger.error('message:send error', err)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // ─── SCREENSHOT DETECTION ──────────────────────────
    socket.on('chat:screenshot', async (data: { conversationId: string, messageId?: string }) => {
      // Notify the room that a screenshot was taken
      socket.to(`conv:${data.conversationId}`).emit('chat:screenshot_alert', {
        userId, username: socket.username, conversationId: data.conversationId, messageId: data.messageId
      })
      
      if (data.messageId) {
        try {
          await prisma.message.update({
            where: { id: data.messageId },
            data: { screenshotTaken: true }
          })
        } catch (e) { logger.error('Failed to update screenshot flag:', e) }
      }
    })

    // ─── TYPING INDICATOR ──────────────────────────────
    socket.on('typing:start', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:start', {
        userId, username: socket.username, conversationId: data.conversationId,
      })
    })

    socket.on('typing:stop', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:stop', {
        userId, conversationId: data.conversationId,
      })
    })

    // ─── MESSAGE READ ──────────────────────────────────
    socket.on('message:read', async (data: { messageId: string; conversationId: string }) => {
      try {
        await prisma.messageRead.upsert({
          where: { messageId_userId: { messageId: data.messageId, userId } },
          create: { messageId: data.messageId, userId },
          update: { readAt: new Date() },
        })

        socket.to(`conv:${data.conversationId}`).emit('message:read', {
          messageId: data.messageId, userId,
        })
      } catch {}
    })

    // ─── REACTION ──────────────────────────────────────
    socket.on('reaction:add', async (data: { messageId: string; emoji: string; conversationId: string }) => {
      try {
        if (!await checkSocketRateLimit(userId, 'reaction', 20, 10)) return

        await prisma.messageReaction.upsert({
          where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji: data.emoji } },
          create: { messageId: data.messageId, userId, emoji: data.emoji },
          update: {},
        })

        io.to(`conv:${data.conversationId}`).emit('reaction:added', {
          messageId: data.messageId, userId, emoji: data.emoji,
        })
      } catch {}
    })

    // ─── CHANNEL MESSAGE ───────────────────────────────
    socket.on('channel:message', async (data: {
      channelId: string
      communityId: string
      content: string
    }) => {
      try {
        if (!await checkSocketRateLimit(userId, 'channel_msg', 20, 10)) return

        const member = await prisma.communityMember.findFirst({
          where: { communityId: data.communityId, userId },
        })
        if (!member) return

        const sanitized = data.content.trim().slice(0, 5000)
        if (!sanitized) return

        const message = await prisma.channelMessage.create({
          data: { channelId: data.channelId, senderId: userId, content: sanitized },
          include: {
            sender: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
            attachments: true,
          },
        })

        io.to(`community:${data.communityId}`).emit('channel:message', {
          channelId: data.channelId, message,
        })
      } catch (err) {
        logger.error('channel:message error', err)
      }
    })

    // ─── DISCONNECT ────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${userId}`)
      await redis.del(`online:${userId}`)
      await redis.sRem('online_users', userId)
      io.emit('user:online', { userId, online: false })
    })

    // ─── PING/PONG for presence ────────────────────────
    socket.on('ping:presence', async () => {
      await redis.setEx(`online:${userId}`, 300, '1')
      socket.emit('pong:presence')
    })
  })
}
