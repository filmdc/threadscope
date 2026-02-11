import rateLimit from 'express-rate-limit';

// General API rate limit
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return (req as unknown as Record<string, unknown>).userId as string ?? req.ip ?? 'unknown';
  },
});

// Stricter rate limit for auth endpoints (per IP)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
});

// Per-account rate limit for login (keyed by email in request body)
export const loginAccountRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per email per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts for this account, please try again later' },
  keyGenerator: (req) => {
    const email = (req.body as Record<string, unknown>)?.email;
    return typeof email === 'string' ? email.toLowerCase() : req.ip ?? 'unknown';
  },
});

// Extension API rate limit
export const extensionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Extension rate limit exceeded' },
  keyGenerator: (req) => {
    return (req as unknown as Record<string, unknown>).userId as string ?? req.ip ?? 'unknown';
  },
});
