import { Request } from 'express'

export interface PaginationOptions {
  page: number
  limit: number
  skip: number
}

export function getPagination(req: Request, defaultLimit = 20, maxLimit = 100): PaginationOptions {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaultLimit))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export function paginateResponse<T>(
  res: import('express').Response,
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  res.set({
    'X-Total-Count': String(total),
    'X-Page': String(page),
    'X-Limit': String(limit),
    'X-Total-Pages': String(Math.ceil(total / limit)),
  })
  return res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
}
