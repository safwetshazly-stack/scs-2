import { Request, Response, NextFunction } from 'express'
import { prisma, redis } from '../server'
import { AppError } from '../utils/errors'

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true, username: true, role: true, createdAt: true,
        profile: true,
        _count: { select: { followers: true, following: true, coursesCreated: true, enrollments: true, communitiesOwned: true } },
      },
    })
    if (!user) throw new AppError('User not found', 404)

    let isFollowing = false
    if (req.user && req.user.id !== user.id) {
      const follow = await prisma.follow.findFirst({ where: { followerId: req.user.id, followingId: user.id } })
      isFollowing = !!follow
    }

    res.json({ ...user, isFollowing })
  } catch (e) { next(e) }
}

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bio, country, city, university, major, website, githubUrl, linkedinUrl, skills, avatar, coverImage } = req.body
    const profile = await prisma.userProfile.update({
      where: { userId: req.user!.id },
      data: { bio, country, city, university, major, website, githubUrl, linkedinUrl, skills, avatar, coverImage },
    })
    await redis.del(`user:${req.user!.id}`)
    res.json(profile)
  } catch (e) { next(e) }
}

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language, theme, emailNotifications, pushNotifications, showOnlineStatus, showLastSeen, allowMessages } = req.body
    const settings = await prisma.userSettings.update({
      where: { userId: req.user!.id },
      data: { language, theme, emailNotifications, pushNotifications, showOnlineStatus, showLastSeen, allowMessages },
    })
    res.json(settings)
  } catch (e) { next(e) }
}

export const follow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followerId = req.user!.id
    const followingId = req.params.id
    if (followerId === followingId) throw new AppError('Cannot follow yourself', 400)

    const blocked = await prisma.blockedUser.findFirst({ where: { blockerId: followingId, blockedId: followerId } })
    if (blocked) throw new AppError('Action not permitted', 403)

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    })
    await prisma.notification.create({
      data: { userId: followingId, type: 'FOLLOW', title: 'متابع جديد', body: `بدأ ${req.user!.id} متابعتك`, data: { userId: followerId } },
    })
    res.json({ message: 'Followed' })
  } catch (e) { next(e) }
}

export const unfollow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.follow.deleteMany({ where: { followerId: req.user!.id, followingId: req.params.id } })
    res.json({ message: 'Unfollowed' })
  } catch (e) { next(e) }
}

export const getFollowers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } })
    if (!user) throw new AppError('User not found', 404)
    const followers = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: { select: { id: true, username: true, profile: { select: { avatar: true, bio: true } } } } },
    })
    res.json(followers.map(f => f.follower))
  } catch (e) { next(e) }
}

export const getFollowing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { username: req.params.username } })
    if (!user) throw new AppError('User not found', 404)
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: { select: { id: true, username: true, profile: { select: { avatar: true, bio: true } } } } },
    })
    res.json(following.map(f => f.following))
  } catch (e) { next(e) }
}

export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blockerId = req.user!.id
    const blockedId = req.params.id
    if (blockerId === blockedId) throw new AppError('Cannot block yourself', 400)

    await prisma.$transaction([
      prisma.blockedUser.upsert({ where: { blockerId_blockedId: { blockerId, blockedId } }, create: { blockerId, blockedId }, update: {} }),
      prisma.follow.deleteMany({ where: { OR: [{ followerId: blockerId, followingId: blockedId }, { followerId: blockedId, followingId: blockerId }] } }),
    ])
    res.json({ message: 'User blocked' })
  } catch (e) { next(e) }
}

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { userId: req.user!.id, isValid: true, expiresAt: { gt: new Date() } },
      select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(sessions)
  } catch (e) { next(e) }
}

export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.userSession.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { isValid: false } })
    res.json({ message: 'Session revoked' })
  } catch (e) { next(e) }
}

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit = '10' } = req.query
    if (!q) return res.json([])
    const users = await prisma.user.findMany({
      where: {
        OR: [{ username: { contains: q as string, mode: 'insensitive' } }, { email: { contains: q as string, mode: 'insensitive' } }],
        isBanned: false,
      },
      take: +limit,
      select: { id: true, username: true, role: true, profile: { select: { avatar: true, bio: true } } },
    })
    res.json(users)
  } catch (e) { next(e) }
}

export const addBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resourceType, resourceId } = req.body
    await prisma.bookmark.upsert({
      where: { userId_resourceType_resourceId: { userId: req.user!.id, resourceType, resourceId } },
      create: { userId: req.user!.id, resourceType, resourceId },
      update: {},
    })
    res.json({ message: 'Bookmarked' })
  } catch (e) { next(e) }
}

export const removeBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.bookmark.deleteMany({ where: { userId: req.user!.id, resourceType: req.query.type as string, resourceId: req.params.id } })
    res.json({ message: 'Bookmark removed' })
  } catch (e) { next(e) }
}

export const getBookmarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } })
    res.json(bookmarks)
  } catch (e) { next(e) }
}
