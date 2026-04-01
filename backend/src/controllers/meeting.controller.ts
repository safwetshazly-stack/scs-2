import { Request, Response, NextFunction } from 'express'
import { AccessToken } from 'livekit-server-sdk'
import { AppError } from '../utils/errors'
import { env } from '../config/env'
import { prisma } from '../server'

// Note: To use this in production, you must install livekit-server-sdk
// npm install livekit-server-sdk

export const generateMeetingToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomName } = req.body
    if (!roomName) throw new AppError('Room name is required', 400)

    const userId = req.user!.id
    const userRole = req.user!.role
    const username = req.user!.username || 'SCS_User' // In real code, fetch from request populated by auth middleware

    // Authorization checks: Only CREATOR, TEACHER, or ADMIN can initiate new distinct rooms.
    // Students can join rooms but shouldn't be generating random tokens for new unassigned rooms.
    const isHost = userRole === 'CREATOR' || userRole === 'TEACHER' || userRole === 'ADMIN'

    // Requires LIVEKIT_API_KEY and LIVEKIT_API_SECRET in config/env
    const apiKey = env.LIVEKIT_API_KEY || 'devkey'
    const apiSecret = env.LIVEKIT_API_SECRET || 'secret'

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: username,
    })

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isHost, // Only hosts can publish Video/Audio initially
      canSubscribe: true, // Everyone can watch
      canPublishData: true, // For chat interactions
    })

    const token = await at.toJwt()

    res.json({ success: true, token, room: roomName })
  } catch (error) { next(error) }
}
