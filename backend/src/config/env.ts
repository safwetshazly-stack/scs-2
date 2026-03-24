import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

function optional(key: string, fallback = ''): string {
  return process.env[key] || fallback
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: parseInt(optional('PORT', '4000')),

  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES: optional('JWT_ACCESS_EXPIRES', '15m'),
  JWT_REFRESH_EXPIRES: optional('JWT_REFRESH_EXPIRES', '30d'),

  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000'),
  MOBILE_URL: optional('MOBILE_URL', ''),

  // AI Services - At least one is required for AI features to work
  OPENAI_API_KEY: optional('OPENAI_API_KEY', ''),
  ANTHROPIC_API_KEY: optional('ANTHROPIC_API_KEY', ''),
  DEEPSEEK_API_KEY: optional('DEEPSEEK_API_KEY', ''),

  // Payment Processing - Required for payment features
  STRIPE_SECRET_KEY: optional('STRIPE_SECRET_KEY', ''),
  STRIPE_WEBHOOK_SECRET: optional('STRIPE_WEBHOOK_SECRET', ''),

  // File Storage - Required for file uploads
  AWS_ACCESS_KEY: optional('AWS_ACCESS_KEY', ''),
  AWS_SECRET_KEY: optional('AWS_SECRET_KEY', ''),
  AWS_REGION: optional('AWS_REGION', 'us-east-1'),
  AWS_BUCKET: optional('AWS_BUCKET', 'scs-platform'),

  SMTP_HOST: optional('SMTP_HOST'),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587')),
  SMTP_USER: optional('SMTP_USER'),
  SMTP_PASS: optional('SMTP_PASS'),
  EMAIL_FROM: optional('EMAIL_FROM', 'SCS Platform <noreply@scsplatform.com>'),
}
