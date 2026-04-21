import { Router } from 'express'
import { UploadService } from '../services/upload.service'
import { UploadController } from '../controllers/upload.controller'
import { authenticate } from '../../../shared/middlewares/auth.middleware'

export function createUploadRoutes(): Router {
  const router = Router()
  const uploadService = new UploadService()
  const uploadController = new UploadController(uploadService)

  router.use(authenticate)

  router.post('/avatar', (req, res, next) => uploadController.uploadAvatar(req, res, next))
  router.post('/cover', (req, res, next) => uploadController.uploadCover(req, res, next))
  router.post('/video', (req, res, next) => uploadController.uploadVideo(req, res, next))
  router.post('/book', (req, res, next) => uploadController.uploadBook(req, res, next))
  router.post('/message', (req, res, next) => uploadController.uploadMessage(req, res, next))
  router.post('/ai-file', (req, res, next) => uploadController.uploadAiFile(req, res, next))

  return router
}
