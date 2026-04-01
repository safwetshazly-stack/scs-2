import { Request, Response, NextFunction } from 'express'
import { prisma } from '../server'
import { AppError } from '../utils/errors'
import slugify from 'slugify'

export const createPlatform = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, theme, logo, coverImage } = req.body
    
    if (!name) throw new AppError('Platform name required', 400)

    const slug = slugify(name, { lower: true, strict: true }) + '-' + Math.floor(Math.random() * 10000)
    
    const platform = await prisma.platform.create({
      data: {
        ownerId: req.user!.id,
        name,
        slug,
        description,
        theme: theme || 'LIGHT',
        logo,
        coverImage,
      }
    })

    res.status(201).json({ success: true, platform })
  } catch (error) { next(error) }
}

export const updatePlatform = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updates = req.body

    const platform = await prisma.platform.findUnique({ where: { id } })
    if (!platform) throw new AppError('Platform not found', 404)
    if (platform.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Not authorized to update this platform', 403)
    }

    const updated = await prisma.platform.update({
      where: { id },
      data: updates
    })
    res.json({ success: true, platform: updated })
  } catch (error) { next(error) }
}

export const getPlatforms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platforms = await prisma.platform.findMany({
      where: { isActive: true },
      include: {
        owner: { select: { username: true, avatar: true } },
        _count: { select: { courses: true } }
      }
    })
    res.json({ success: true, platforms })
  } catch (error) { next(error) }
}
