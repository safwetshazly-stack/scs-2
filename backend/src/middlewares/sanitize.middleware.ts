import { Request, Response, NextFunction } from 'express'
import xss from 'xss'

function sanitizeValue(value: any): any {
  if (typeof value === 'string') return xss(value.trim())
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]))
  }
  return value
}

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body)
  if (req.query) req.query = sanitizeValue(req.query) as any
  if (req.params) req.params = sanitizeValue(req.params)
  next()
}
