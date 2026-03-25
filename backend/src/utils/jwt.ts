import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign(
    { userId, role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES as any, issuer: 'scs-platform', audience: 'scs-client' }
  )

  const refreshToken = jwt.sign(
    { userId },
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
