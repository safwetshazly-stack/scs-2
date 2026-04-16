/**
 * Auth Controller (Refactored)
 * Thin HTTP request/response handler
 * All business logic in AuthService
 */

import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/auth.service'

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, role } = req.body

      const user = await this.authService.register(username, email, password, role)

      res.status(201).json({
        message: 'Account created! Check your email to verify.',
        user,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body
      const ipAddress = req.ip || 'unknown'

      const result = await this.authService.login(email, password, ipAddress)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body
      const ipAddress = req.ip || 'unknown'

      const result = await this.authService.refreshToken(refreshToken, ipAddress)

      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id
      const { refreshToken } = req.body

      if (userId) {
        await this.authService.logout(userId, refreshToken)
      }

      res.json({ message: 'Logged out successfully' })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /auth/verify-email/:token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params

      const user = await this.authService.verifyEmail(token)

      res.json({
        message: 'Email verified successfully!',
        user: { id: user.id, email: user.email, username: user.username },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body

      await this.authService.forgotPassword(email)

      // Don't reveal if email exists
      res.json({
        message: 'If account exists, password reset email has been sent.',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body

      await this.authService.resetPassword(token, password)

      res.json({
        message: 'Password reset successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id!

      const user = await this.authService.getMe(userId)

      res.json(user)
    } catch (error) {
      next(error)
    }
  }
}
