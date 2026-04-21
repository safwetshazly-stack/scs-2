import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { RedisClient } from '../../../shared/database/redis'
import { SearchService } from '../services/search.service'
import { SearchController } from '../controllers/search.controller'
import { optionalAuth } from '../../../shared/middlewares/auth.middleware'

export function createSearchRoutes(prisma: PrismaClient, redis: RedisClient): Router {
  const router = Router()
  const searchService = new SearchService(prisma, redis)
  const searchController = new SearchController(searchService)

  router.get('/', optionalAuth, (req, res, next) => searchController.globalSearch(req, res, next))
  router.get('/suggestions', (req, res, next) => searchController.getSuggestions(req, res, next))

  return router
}
