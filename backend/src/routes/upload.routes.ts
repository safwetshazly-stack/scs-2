import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middlewares/auth.middleware'
import { UploadService } from '../services/upload.service'

export function createUploadRoutes(prisma: PrismaClient): Router {
  const router = Router()
  const uploadService = new UploadService(prisma)

  // All upload routes require authentication
  router.use(authenticate)

  // Return pre-signed URLs directly
  router.post('/avatar', async (req, res, next) => {
    try {
      const { filename, mimetype, size } = req.body
      const result = await uploadService.generateUploadUrl('avatars', req.user!.id, filename, mimetype, size, 5)
      res.json(result)
    } catch (e) { next(e) }
  })

  router.post('/cover', async (req, res, next) => {
    try {
      const { filename, mimetype, size } = req.body
      const result = await uploadService.generateUploadUrl('avatars', req.user!.id, filename, mimetype, size, 5)
      res.json(result)
    } catch (e) { next(e) }
  })

  router.post('/video', async (req, res, next) => {
    try {
      const { filename, mimetype, size } = req.body
      const result = await uploadService.generateUploadUrl('raw-videos', req.user!.id, filename, mimetype, size, 2000)
      res.json(result)
    } catch (e) { next(e) }
  })

  router.post('/book', async (req, res, next) => {
    try {
      const { filename, mimetype, size } = req.body
      const result = await uploadService.generateUploadUrl('books', req.user!.id, filename, mimetype, size, 200)
      res.json(result)
    } catch (e) { next(e) }
  })

  router.post('/message', async (req, res, next) => {
    try {
      const { filename, mimetype, size } = req.body
      const result = await uploadService.generateUploadUrl('attachments', req.user!.id, filename, mimetype, size, 100)
      res.json(result)
    } catch (e) { next(e) }
  })

  router.post('/ai-file', async (req, res, next) => {
    try {
      const { filename, mimetype, size } = req.body
      const result = await uploadService.generateUploadUrl('attachments', req.user!.id, filename, mimetype, size, 100)
      res.json(result)
    } catch (e) { next(e) }
  })

  return router
}


