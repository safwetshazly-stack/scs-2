import { Router } from 'express'
import { createPlatform, updatePlatform, getPlatforms } from '../controllers/platform.controller'
import { authenticate, requireCreator } from '../middlewares/auth.middleware'

export const platformRoutes = Router()

// Public route to list all platforms
platformRoutes.get('/', getPlatforms)

// Protected creator routes
platformRoutes.use(authenticate)
platformRoutes.post('/', requireCreator, createPlatform)
platformRoutes.patch('/:id', requireCreator, updatePlatform)
