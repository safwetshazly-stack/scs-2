import rateLimit from 'express-rate-limit'

export const createRateLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  })

export const rateLimiters = {
  auth:   createRateLimiter(15 * 60 * 1000, 10,  'Too many authentication attempts.'),
  api:    createRateLimiter(15 * 60 * 1000, 200, 'Too many requests.'),
  ai:     createRateLimiter(60 * 1000,      20,  'AI rate limit exceeded.'),
  upload: createRateLimiter(60 * 60 * 1000, 50,  'Upload limit exceeded.'),
  search: createRateLimiter(60 * 1000,      30,  'Search rate limit exceeded.'),
}
