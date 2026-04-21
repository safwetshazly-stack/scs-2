import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../../../config/env'
import { AppError } from '../../../utils/errors'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
const ALLOWED_BOOK_TYPES = ['application/pdf', 'application/epub+zip']
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.php', '.asp', '.aspx', '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.pl', '.cgi', '.html', '.htm', '.xml', '.svg', '.jar', '.war']

export class UploadService {
  private s3Client: S3Client

  constructor() {
    this.s3Client = new S3Client({
      region: env.AWS_REGION || 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY,
        secretAccessKey: env.AWS_SECRET_KEY,
      },
    })
  }

  private validateFileRequest(filename: string, mimetype: string, allowed: string[], maxMB: number, requestedSize: number): string | null {
    if (!allowed.includes(mimetype)) return `File type not allowed. Allowed: ${allowed.join(', ')}`
    const ext = path.extname(filename).toLowerCase()
    if (DANGEROUS_EXTENSIONS.includes(ext)) return 'File extension not permitted'
    if (requestedSize > maxMB * 1024 * 1024) return `File too large. Max: ${maxMB}MB`
    return null
  }

  private sanitizeFilename(name: string): string {
    return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
  }

  async generateUploadUrl(folder: string, userId: string, originalName: string, mimetype: string, size: number, maxMB: number) {
    let allowed: string[] = []
    switch (folder) {
      case 'avatars': allowed = ALLOWED_IMAGE_TYPES; break
      case 'raw-videos': allowed = ALLOWED_VIDEO_TYPES; break
      case 'books': allowed = ALLOWED_BOOK_TYPES; break
      case 'attachments': allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, 'audio/mpeg', 'audio/ogg']; break
      default: allowed = ALLOWED_IMAGE_TYPES
    }

    const error = this.validateFileRequest(originalName, mimetype, allowed, maxMB, size)
    if (error) throw new AppError(error, 400)

    const ext = path.extname(originalName).toLowerCase()
    const key = `${folder}/${userId}/${uuidv4()}${ext}`

    const command = new PutObjectCommand({
      Bucket: env.AWS_BUCKET,
      Key: key,
      ContentType: mimetype,
      Metadata: {
        originalName: this.sanitizeFilename(originalName),
        uploadedBy: userId,
      },
    })

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 1800 })
    return {
      uploadUrl,
      key,
      ...(folder !== 'raw-videos' && { publicUrl: `${env.CDN_URL}/${key}` }),
    }
  }
}
