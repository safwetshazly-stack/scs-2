import { Router } from 'express'
import { optionalAuth } from '../middlewares/auth.middleware'
import { searchService } from '../services/search.service'

export const searchRoutes = Router()

searchRoutes.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { q } = req.query
    if (!q || typeof q !== 'string') return res.json({ courses: [], communities: [], users: [], books: [] })
    const results = await searchService.globalSearch(q, req.user?.id)
    res.json(results)
  } catch (e) { next(e) }
})

searchRoutes.get('/suggestions', async (req, res, next) => {
  try {
    const { q } = req.query
    if (!q || typeof q !== 'string') return res.json([])
    const suggestions = await searchService.getSuggestions(q)
    res.json(suggestions)
  } catch (e) { next(e) }
})
