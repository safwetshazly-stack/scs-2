import { Router } from 'express'
import { authenticate, optionalAuth } from '../middlewares/auth.middleware'
import {
  getProfile, updateProfile, updateSettings, follow, unfollow,
  getFollowers, getFollowing, blockUser, getSessions, revokeSession,
  searchUsers, addBookmark, removeBookmark, getBookmarks,
} from '../controllers/user.controller'

export const userRoutes = Router()

userRoutes.get('/search', optionalAuth, searchUsers)
userRoutes.get('/bookmarks', authenticate, getBookmarks)
userRoutes.get('/sessions', authenticate, getSessions)
userRoutes.get('/:username', optionalAuth, getProfile)
userRoutes.get('/:username/followers', optionalAuth, getFollowers)
userRoutes.get('/:username/following', optionalAuth, getFollowing)
userRoutes.patch('/profile', authenticate, updateProfile)
userRoutes.patch('/settings', authenticate, updateSettings)
userRoutes.post('/:id/follow', authenticate, follow)
userRoutes.delete('/:id/follow', authenticate, unfollow)
userRoutes.post('/:id/block', authenticate, blockUser)
userRoutes.delete('/sessions/:id', authenticate, revokeSession)
userRoutes.post('/bookmarks', authenticate, addBookmark)
userRoutes.delete('/bookmarks/:id', authenticate, removeBookmark)
