import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware'
import {
  generateUploadAvatarUrl,
  generateUploadVideoUrl,
  generateUploadBookUrl,
  generateUploadAttachmentUrl
} from '../controllers/upload.controller'

export const uploadRoutes = Router()

// All upload routes require authentication
uploadRoutes.use(authenticate)

// Return pre-signed URLs directly
uploadRoutes.post('/avatar', generateUploadAvatarUrl)
uploadRoutes.post('/cover', generateUploadAvatarUrl) // reused for cover images
uploadRoutes.post('/video', generateUploadVideoUrl)
uploadRoutes.post('/book', generateUploadBookUrl)
uploadRoutes.post('/message', generateUploadAttachmentUrl)
uploadRoutes.post('/ai-file', generateUploadAttachmentUrl)

