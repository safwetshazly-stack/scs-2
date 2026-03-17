import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { env } from '../config/env'

import { AppError } from '../utils/errors'

// ─── PRISMA ERROR HANDLER ─────────────────────────────────
function handlePrismaError(err: any): AppError {
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field'
    return new AppError(`This ${field} is already taken.`, 409, 'DUPLICATE')
  }
  if (err.code === 'P2025') {
    return new AppError('Record not found.', 404, 'NOT_FOUND')
  }
  if (err.code === 'P2003') {
    return new AppError('Related record not found.', 400, 'RELATION_ERROR')
  }
  return new AppError('Database error occurred.', 500, 'DB_ERROR')
}

// ─── JWT ERROR HANDLER ────────────────────────────────────
function handleJwtError(): AppError {
  return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN')
}

function handleJwtExpiredError(): AppError {
  return new AppError('Token expired. Please log in again.', 401, 'TOKEN_EXPIRED')
}

// ─── VALIDATION ERROR ─────────────────────────────────────
function handleValidationError(err: any): AppError {
  const errors = err.array?.().map((e: any) => e.msg) || []
  const message = errors.length > 0 ? errors[0] : 'Validation failed'
  return new AppError(message, 422, 'VALIDATION_ERROR')
}

// ─── MAIN ERROR HANDLER ───────────────────────────────────
export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  let error = err

  // Convert known errors
  if (err.code?.startsWith('P')) error = handlePrismaError(err)
  else if (err.name === 'JsonWebTokenError') error = handleJwtError()
  else if (err.name === 'TokenExpiredError') error = handleJwtExpiredError()
  else if (err.name === 'ValidationError' || err.array) error = handleValidationError(err)
  else if (!(err instanceof AppError)) {
    error = new AppError('Internal server error', 500)
  }

  // Log errors
  if (error.statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    })
  }

  const response: any = {
    error: error.message,
    code: error.code,
    status: error.statusCode,
  }

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(error.statusCode || 500).json(response)
}
