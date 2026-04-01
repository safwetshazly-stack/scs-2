import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export function generateTokens(userId: string, role: string, subscriptionTier: string = 'FREE') {
  const accessToken = jwt.sign(
    { userId, role, subscriptionTier },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES as any, issuer: 'scs-platform', audience: 'scs-client' }
  )

  const refreshToken = jwt.sign(
    { userId, tokenVersion: 1 }, // tokenVersion allows invalidating all refresh tokens for a user
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES as any, issuer: 'scs-platform', audience: 'scs-client' }
  )

  return { accessToken, refreshToken }
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'scs-platform',
    audience: 'scs-client',
  }) as { userId: string }
}
