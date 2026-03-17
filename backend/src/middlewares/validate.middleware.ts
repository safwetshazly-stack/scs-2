import { Request, Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import { AppError } from '../utils/errors'

export const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = errors.array()[0].msg
    throw new AppError(message, 422, 'VALIDATION_ERROR')
  }
  next()
}
