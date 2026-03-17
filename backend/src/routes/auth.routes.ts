import { Router } from 'express'
import { body, param } from 'express-validator'
import { validate } from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'
import {
  register, login, refreshToken, logout,
  verifyEmail, forgotPassword, resetPassword, getMe,
} from '../controllers/auth.controller'

export const authRoutes = Router()

// ─── VALIDATORS ───────────────────────────────────────────
const registerValidators = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('role')
    .optional()
    .isIn(['USER', 'INSTRUCTOR'])
    .withMessage('Role must be USER or INSTRUCTOR'),
]

const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password required'),
]

const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Token required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
]

// ─── ROUTES ───────────────────────────────────────────────
authRoutes.post('/register', registerValidators, validate, register)
authRoutes.post('/login', loginValidators, validate, login)
authRoutes.post('/refresh', refreshToken)
authRoutes.post('/logout', authenticate, logout)
authRoutes.get('/verify-email/:token', param('token').notEmpty(), validate, verifyEmail)
authRoutes.post('/forgot-password', body('email').isEmail(), validate, forgotPassword)
authRoutes.post('/reset-password', resetPasswordValidators, validate, resetPassword)
authRoutes.get('/me', authenticate, getMe)
