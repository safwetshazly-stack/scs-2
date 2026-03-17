import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import AWS from 'aws-sdk'
import { authenticate } from '../middlewares/auth.middleware'
import { AppError } from '../utils/errors'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export const uploadRoutes = Router()
uploadRoutes.use(authenticate)

const s3 = new AWS.S3({
  accessKeyId: env.AWS_ACCESS_KEY,
  secretAccessKey: env.AWS_SECRET_KEY,
  region: env.AWS_REGION,
})

// ─── ALLOWED FILE TYPES ───────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_DOC_TYPES   = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
const ALLOWED_BOOK_TYPES  = ['application/pdf', 'application/epub+zip']

// ─── DANGEROUS EXTENSIONS ─────────────────────────────────
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.php', '.asp', '.aspx',
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.pl', '.cgi',
  '.html', '.htm', '.xml', '.svg', '.jar', '.war',
]

function validateFile(file: Express.Multer.File, allowed: string[], maxMB: number): string | null {
  if (!allowed.includes(file.mimetype)) return `File type not allowed. Allowed: ${allowed.join(', ')}`
  const ext = path.extname(file.originalname).toLowerCase()
  if (DANGEROUS_EXTENSIONS.includes(ext)) return 'File extension not permitted'
  if (file.size > maxMB * 1024 * 1024) return `File too large. Max: ${maxMB}MB`
  return null
}

function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

async function uploadToS3(file: Express.Multer.File, folder: string, userId: string): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase()
  const filename = `${folder}/${userId}/${uuidv4()}${ext}`

  const params: AWS.S3.PutObjectRequest = {
    Bucket: env.AWS_BUCKET,
    Key: filename,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
    ServerSideEncryption: 'AES256',
    Metadata: {
      originalName: sanitizeFilename(file.originalname),
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    },
  }

  const result = await s3.upload(params).promise()
  return result.Location
}

// ─── MULTER CONFIG (memory only, no disk) ─────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
})

// ─── AVATAR ───────────────────────────────────────────────
uploadRoutes.post('/avatar', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)
    const error = validateFile(req.file, ALLOWED_IMAGE_TYPES, 5)
    if (error) throw new AppError(error, 400)

    const url = await uploadToS3(req.file, 'avatars', req.user!.id)
    res.json({ url })
  } catch (error) { next(error) }
})

// ─── COVER IMAGE ──────────────────────────────────────────
uploadRoutes.post('/cover', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)
    const error = validateFile(req.file, ALLOWED_IMAGE_TYPES, 10)
    if (error) throw new AppError(error, 400)

    const url = await uploadToS3(req.file, 'covers', req.user!.id)
    res.json({ url })
  } catch (error) { next(error) }
})

// ─── MESSAGE ATTACHMENT ───────────────────────────────────
uploadRoutes.post('/message', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, 'audio/mpeg', 'audio/ogg']
    const error = validateFile(req.file, allowed, 20)
    if (error) throw new AppError(error, 400)

    const url = await uploadToS3(req.file, 'messages', req.user!.id)
    res.json({
      url,
      name: sanitizeFilename(req.file.originalname),
      type: req.file.mimetype,
      size: req.file.size,
    })
  } catch (error) { next(error) }
})

// ─── COURSE VIDEO ─────────────────────────────────────────
uploadRoutes.post('/video', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)
    const error = validateFile(req.file, ALLOWED_VIDEO_TYPES, 500)
    if (error) throw new AppError(error, 400)

    const url = await uploadToS3(req.file, 'videos', req.user!.id)
    res.json({ url, size: req.file.size, type: req.file.mimetype })
  } catch (error) { next(error) }
})

// ─── BOOK PDF ─────────────────────────────────────────────
uploadRoutes.post('/book', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)
    const error = validateFile(req.file, ALLOWED_BOOK_TYPES, 100)
    if (error) throw new AppError(error, 400)

    const url = await uploadToS3(req.file, 'books', req.user!.id)
    res.json({ url, size: req.file.size })
  } catch (error) { next(error) }
})

// ─── AI FILE ANALYSIS ─────────────────────────────────────
uploadRoutes.post('/ai-file', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]
    const error = validateFile(req.file, allowed, 20)
    if (error) throw new AppError(error, 400)

    const url = await uploadToS3(req.file, 'ai-files', req.user!.id)
    res.json({
      url,
      name: sanitizeFilename(req.file.originalname),
      type: req.file.mimetype,
      size: req.file.size,
    })
  } catch (error) { next(error) }
})
