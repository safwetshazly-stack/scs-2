import { Request, Response, NextFunction } from 'express'
import { prisma, redis } from '../server'
import { AppError } from '../utils/errors'

const CACHE_TTL = 60

// ─── GET ALL ──────────────────────────────────────────────
export const getCommunities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search, category } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = {}
    if (search) where.name = { contains: search as string, mode: 'insensitive' }
    if (category) where.tags = { has: category }

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { membersCount: 'desc' },
        select: {
          id: true, name: true, slug: true, description: true,
          avatar: true, isPrivate: true, membersCount: true, createdAt: true,
          owner: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
          _count: { select: { channels: true } },
        },
      }),
      prisma.community.count({ where }),
    ])

    res.set('X-Total-Count', total.toString())
    res.json({ communities, total, page: parseInt(page as string), limit: parseInt(limit as string) })
  } catch (error) { next(error) }
}

// ─── GET ONE ──────────────────────────────────────────────
export const getCommunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params
    const cacheKey = `community:${slug}`
    const cached = await redis.get(cacheKey)
    if (cached) return res.json(JSON.parse(cached))

    const community = await prisma.community.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
        channels: { orderBy: { position: 'asc' }, select: { id: true, name: true, type: true, position: true } },
        _count: { select: { members: true, posts: true } },
      },
    })
    if (!community) throw new AppError('Community not found', 404)

    // Check membership
    let isMember = false
    let memberRole = null
    if (req.user) {
      const membership = await prisma.communityMember.findFirst({
        where: { communityId: community.id, userId: req.user.id },
        select: { role: true },
      })
      isMember = !!membership
      memberRole = membership?.role
    }

    const data = { ...community, isMember, memberRole }
    await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(data))
    res.json(data)
  } catch (error) { next(error) }
}

// ─── CREATE ───────────────────────────────────────────────
export const createCommunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, isPrivate = false } = req.body
    const userId = req.user!.id

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()

    const community = await prisma.$transaction(async (tx) => {
      const c = await tx.community.create({
        data: { name, slug, description, isPrivate, ownerId: userId, membersCount: 1 },
      })
      await tx.communityMember.create({
        data: { communityId: c.id, userId, role: 'OWNER' },
      })
      // Default channels
      await tx.communityChannel.createMany({
        data: [
          { communityId: c.id, name: 'عام', type: 'TEXT', position: 0 },
          { communityId: c.id, name: 'إعلانات', type: 'ANNOUNCEMENTS', position: 1 },
          { communityId: c.id, name: 'ملفات', type: 'FILES', position: 2 },
        ],
      })
      return c
    })

    res.status(201).json(community)
  } catch (error) { next(error) }
}

// ─── UPDATE ───────────────────────────────────────────────
export const updateCommunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const member = await prisma.communityMember.findFirst({
      where: { communityId: id, userId, role: { in: ['OWNER', 'ADMIN'] } },
    })
    if (!member) throw new AppError('Insufficient permissions', 403)

    const { name, description, isPrivate, avatar } = req.body
    const community = await prisma.community.update({
      where: { id },
      data: { name, description, isPrivate, avatar },
    })

    await redis.del(`community:${community.slug}`)
    res.json(community)
  } catch (error) { next(error) }
}

// ─── DELETE ───────────────────────────────────────────────
export const deleteCommunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const community = await prisma.community.findUnique({ where: { id } })
    if (!community) throw new AppError('Community not found', 404)
    if (community.ownerId !== userId && req.user!.role !== 'ADMIN') {
      throw new AppError('Only the owner can delete this community', 403)
    }

    await prisma.community.delete({ where: { id } })
    await redis.del(`community:${community.slug}`)
    res.json({ message: 'Community deleted' })
  } catch (error) { next(error) }
}

// ─── JOIN ─────────────────────────────────────────────────
export const joinCommunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const community = await prisma.community.findUnique({ where: { id } })
    if (!community) throw new AppError('Community not found', 404)
    if (community.isPrivate) throw new AppError('This is a private community. You need an invite.', 403)

    const existing = await prisma.communityMember.findFirst({ where: { communityId: id, userId } })
    if (existing) throw new AppError('Already a member', 409)

    await prisma.$transaction([
      prisma.communityMember.create({ data: { communityId: id, userId, role: 'MEMBER' } }),
      prisma.community.update({ where: { id }, data: { membersCount: { increment: 1 } } }),
    ])

    await redis.del(`community:${community.slug}`)
    res.json({ message: 'Joined successfully' })
  } catch (error) { next(error) }
}

// ─── LEAVE ────────────────────────────────────────────────
export const leaveCommunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const community = await prisma.community.findUnique({ where: { id } })
    if (!community) throw new AppError('Community not found', 404)
    if (community.ownerId === userId) throw new AppError('Owner cannot leave. Transfer ownership first.', 400)

    await prisma.$transaction([
      prisma.communityMember.deleteMany({ where: { communityId: id, userId } }),
      prisma.community.update({ where: { id }, data: { membersCount: { decrement: 1 } } }),
    ])

    await redis.del(`community:${community.slug}`)
    res.json({ message: 'Left community' })
  } catch (error) { next(error) }
}

// ─── MEMBERS ──────────────────────────────────────────────
export const getMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { page = '1', limit = '30' } = req.query
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const isMember = await prisma.communityMember.findFirst({
      where: { communityId: id, userId: req.user!.id },
    })
    if (!isMember) throw new AppError('Not a member', 403)

    const members = await prisma.communityMember.findMany({
      where: { communityId: id },
      skip,
      take: parseInt(limit as string),
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: {
        user: { select: { id: true, username: true, profile: { select: { avatar: true, bio: true } } } },
      },
    })
    res.json(members)
  } catch (error) { next(error) }
}

// ─── CHANNELS ─────────────────────────────────────────────
export const getChannels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const isMember = await prisma.communityMember.findFirst({
      where: { communityId: id, userId: req.user!.id },
    })
    if (!isMember) throw new AppError('Not a member', 403)

    const channels = await prisma.communityChannel.findMany({
      where: { communityId: id },
      orderBy: { position: 'asc' },
    })
    res.json(channels)
  } catch (error) { next(error) }
}

// ─── CREATE CHANNEL ───────────────────────────────────────
export const createChannel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { name, type = 'TEXT', description } = req.body

    const member = await prisma.communityMember.findFirst({
      where: { communityId: id, userId: req.user!.id, role: { in: ['OWNER', 'ADMIN', 'MODERATOR'] } },
    })
    if (!member) throw new AppError('Insufficient permissions', 403)

    const lastChannel = await prisma.communityChannel.findFirst({
      where: { communityId: id },
      orderBy: { position: 'desc' },
    })
    const position = (lastChannel?.position ?? -1) + 1

    const channel = await prisma.communityChannel.create({
      data: { communityId: id, name, type, description, position },
    })
    res.status(201).json(channel)
  } catch (error) { next(error) }
}

// ─── CHANNEL MESSAGES ─────────────────────────────────────
export const getChannelMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { channelId } = req.params
    const { before, limit = '50' } = req.query

    const channel = await prisma.communityChannel.findUnique({ where: { id: channelId } })
    if (!channel) throw new AppError('Channel not found', 404)

    const isMember = await prisma.communityMember.findFirst({
      where: { communityId: channel.communityId, userId: req.user!.id },
    })
    if (!isMember) throw new AppError('Not a member', 403)

    const messages = await prisma.channelMessage.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: new Date(before as string) } } : {}),
      },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, profile: { select: { avatar: true } } } },
        attachments: true,
      },
    })

    res.json(messages.reverse())
  } catch (error) { next(error) }
}
