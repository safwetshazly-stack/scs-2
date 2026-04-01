import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env'
import { AppError } from '../utils/errors'

const s3Client = new S3Client({
  region: env.AWS_REGION || 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_KEY,
  },
})

// ─── ALLOWED FILE TYPES ───────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_DOC_TYPES   = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
const ALLOWED_BOOK_TYPES  = ['application/pdf', 'application/epub+zip']

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.php', '.asp', '.aspx',
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.pl', '.cgi',
  '.html', '.htm', '.xml', '.svg', '.jar', '.war',
]

function validateFileRequest(filename: string, mimetype: string, allowed: string[], maxMB: number, requestedSize: number): string | null {
  if (!allowed.includes(mimetype)) return `File type not allowed. Allowed: ${allowed.join(', ')}`
  const ext = path.extname(filename).toLowerCase()
  if (DANGEROUS_EXTENSIONS.includes(ext)) return 'File extension not permitted'
  if (requestedSize > maxMB * 1024 * 1024) return `File too large. Max: ${maxMB}MB`
  return null
}

function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

async function getPresignedUploadUrl(folder: string, userId: string, originalName: string, mimetype: string): Promise<{ uploadUrl: string, key: string }> {
  const ext = path.extname(originalName).toLowerCase()
  const key = `${folder}/${userId}/${uuidv4()}${ext}`

  const command = new PutObjectCommand({
    Bucket: env.AWS_BUCKET,
    Key: key,
    ContentType: mimetype,
    Metadata: {
      originalName: sanitizeFilename(originalName),
      uploadedBy: userId,
    },
  })

  // URL valid for 30 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 1800 })
  return { uploadUrl, key }
}

export const generateUploadAvatarUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, mimetype, size } = req.body
    if (!filename || !mimetype || !size) throw new AppError('Missing file metadata', 400)
    
    const error = validateFileRequest(filename, mimetype, ALLOWED_IMAGE_TYPES, 5, size)
    if (error) throw new AppError(error, 400)

    const data = await getPresignedUploadUrl('avatars', req.user!.id, filename, mimetype)
    res.json({ ...data, publicUrl: `${env.CDN_URL}/${data.key}` })
  } catch (err) { next(err) }
}

export const generateUploadVideoUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, mimetype, size } = req.body
    if (!filename || !mimetype || !size) throw new AppError('Missing video metadata', 400)
    
    const error = validateFileRequest(filename, mimetype, ALLOWED_VIDEO_TYPES, 2000, size) // 2GB max
    if (error) throw new AppError(error, 400)

    // Videos upload to a RAW bucket or raw prefix usually for processing by FFmpeg worker
    // Here we use 'raw-videos' folder which FFmpeg will poll
    const data = await getPresignedUploadUrl('raw-videos', req.user!.id, filename, mimetype)
    res.json({ ...data })
  } catch (err) { next(err) }
}

export const generateUploadBookUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, mimetype, size } = req.body
    if (!filename || !mimetype || !size) throw new AppError('Missing book metadata', 400)
    
    const error = validateFileRequest(filename, mimetype, ALLOWED_BOOK_TYPES, 200, size)
    if (error) throw new AppError(error, 400)

    const data = await getPresignedUploadUrl('books', req.user!.id, filename, mimetype)
    res.json({ ...data, publicUrl: `${env.CDN_URL}/${data.key}` })
  } catch (err) { next(err) }
}

export const generateUploadAttachmentUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, mimetype, size } = req.body
    if (!filename || !mimetype || !size) throw new AppError('Missing file metadata', 400)
    
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, 'audio/mpeg', 'audio/ogg']
    const error = validateFileRequest(filename, mimetype, allowed, 100, size)
    if (error) throw new AppError(error, 400)

    const data = await getPresignedUploadUrl('attachments', req.user!.id, filename, mimetype)
    res.json({ ...data, publicUrl: `${env.CDN_URL}/${data.key}` })
  } catch (err) { next(err) }
}
