import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { validate } from '../middlewares/validate.middleware'
import { authenticate, optionalAuth } from '../middlewares/auth.middleware'
import {
  getCommunities, getCommunity, createCommunity,
  updateCommunity, deleteCommunity, joinCommunity,
  leaveCommunity, getMembers, getChannels,
  createChannel, getChannelMessages,
} from '../controllers/community.controller'

export const communityRoutes = Router()

communityRoutes.get('/', optionalAuth, getCommunities)
communityRoutes.get('/:slug', optionalAuth, param('slug').notEmpty(), validate, getCommunity)
communityRoutes.post('/', authenticate, [
  body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 chars'),
  body('description').optional().isLength({ max: 500 }),
  body('isPrivate').optional().isBoolean(),
], validate, createCommunity)
communityRoutes.patch('/:id', authenticate, updateCommunity)
communityRoutes.delete('/:id', authenticate, deleteCommunity)
communityRoutes.post('/:id/join', authenticate, joinCommunity)
communityRoutes.delete('/:id/leave', authenticate, leaveCommunity)
communityRoutes.get('/:id/members', authenticate, getMembers)
communityRoutes.get('/:id/channels', authenticate, getChannels)
communityRoutes.post('/:id/channels', authenticate, [
  body('name').trim().isLength({ min: 2, max: 30 }),
  body('type').isIn(['TEXT', 'ANNOUNCEMENTS', 'FILES']),
], validate, createChannel)
communityRoutes.get('/channels/:channelId/messages', authenticate, getChannelMessages)
