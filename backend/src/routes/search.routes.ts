import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { RedisClientType } from 'redis'
import { optionalAuth } from '../middlewares/auth.middleware'
import { SearchService } from '../services/search.service'

export function createSearchRoutes(prisma: PrismaClient, redis: RedisClientType): Router {
  const router = Router()
  const searchService = new SearchService(prisma, redis)

  router.get('/', optionalAuth, async (req, res, next) => {
    try {
      const { q } = req.query
      if (!q || typeof q !== 'string') return res.json({ courses: [], communities: [], users: [], books: [] })
      const results = await searchService.globalSearch(q, req.user?.id)
      res.json(results)
    } catch (e) { next(e) }
  })

  router.get('/suggestions', async (req, res, next) => {
    try {
      const { q } = req.query
      if (!q || typeof q !== 'string') return res.json([])
      const suggestions = await searchService.getSuggestions(q)
      res.json(suggestions)
    } catch (e) { next(e) }
  })

  return router
}

