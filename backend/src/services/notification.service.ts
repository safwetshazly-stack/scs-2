import { prisma } from '../server'
import { io } from '../server'
import { sendVerificationEmail } from '../utils/email'

type NotifType = 'MESSAGE' | 'COMMUNITY' | 'COURSE' | 'PAYMENT' | 'SYSTEM' | 'AI' | 'FOLLOW'

interface CreateNotifInput {
  userId: string
  type: NotifType
  title: string
  body: string
  data?: Record<string, any>
}

export const notificationService = {
  create: async (input: CreateNotifInput) => {
    const notif = await prisma.notification.create({ data: input })

    // Send real-time via Socket.IO
    io.to(`user:${input.userId}`).emit('notification:new', notif)

    return notif
  },

  createMany: async (inputs: CreateNotifInput[]) => {
    await prisma.notification.createMany({ data: inputs })
    inputs.forEach(input => {
      io.to(`user:${input.userId}`).emit('notification:new', { type: input.type })
    })
  },

  // Notify all members of a conversation
  notifyConversationMembers: async (
    conversationId: string,
    excludeUserId: string,
    notification: Omit<CreateNotifInput, 'userId'>
  ) => {
    const members = await prisma.conversationMember.findMany({
      where: { conversationId, userId: { not: excludeUserId } },
      select: { userId: true },
    })

    const inputs = members.map(m => ({ ...notification, userId: m.userId }))
    await notificationService.createMany(inputs)
  },

  // Notify community members
  notifyCommunityMembers: async (
    communityId: string,
    excludeUserId: string,
    notification: Omit<CreateNotifInput, 'userId'>
  ) => {
    const members = await prisma.communityMember.findMany({
      where: { communityId, userId: { not: excludeUserId } },
      select: { userId: true },
      take: 500,
    })

    const inputs = members.map(m => ({ ...notification, userId: m.userId }))
    if (inputs.length > 0) await notificationService.createMany(inputs)
  },
}
