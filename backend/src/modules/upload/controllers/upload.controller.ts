import { Request, Response, NextFunction } from 'express'
import { UploadService } from '../services/upload.service'

export class UploadController {
  constructor(private uploadService: UploadService) {}

  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename, mimetype, size } = req.body
      const result = await this.uploadService.generateUploadUrl('avatars', req.user!.id, filename, mimetype, size, 5)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async uploadCover(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename, mimetype, size } = req.body
      const result = await this.uploadService.generateUploadUrl('avatars', req.user!.id, filename, mimetype, size, 5)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async uploadVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename, mimetype, size } = req.body
      const result = await this.uploadService.generateUploadUrl('raw-videos', req.user!.id, filename, mimetype, size, 2000)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async uploadBook(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename, mimetype, size } = req.body
      const result = await this.uploadService.generateUploadUrl('books', req.user!.id, filename, mimetype, size, 200)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async uploadMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename, mimetype, size } = req.body
      const result = await this.uploadService.generateUploadUrl('attachments', req.user!.id, filename, mimetype, size, 100)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async uploadAiFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename, mimetype, size } = req.body
      const result = await this.uploadService.generateUploadUrl('attachments', req.user!.id, filename, mimetype, size, 100)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
}
