import { Request, Response, NextFunction } from 'express'
import { SearchService } from '../services/search.service'

export class SearchController {
  constructor(private searchService: SearchService) {}

  async globalSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query
      if (!q || typeof q !== 'string') return res.json({ courses: [], communities: [], users: [], books: [] })
      const results = await this.searchService.globalSearch(q, req.user?.id)
      res.json(results)
    } catch (error) {
      next(error)
    }
  }

  async getSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query
      if (!q || typeof q !== 'string') return res.json([])
      const suggestions = await this.searchService.getSuggestions(q)
      res.json(suggestions)
    } catch (error) {
      next(error)
    }
  }
}
