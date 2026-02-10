import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { encrypt, decrypt } from '../lib/encryption';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth';
import { authRateLimit } from '../middleware/rate-limit';
import {
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
  THREADS_OAUTH_URL,
  THREADS_TOKEN_URL,
  THREADS_SCOPES,
} from '../lib/constants';
import { ThreadsApiClient } from '../lib/threads-client';

const router = Router();

// ==================== Validation Schemas ====================

// Use strong password policy: min 8 chars, uppercase, lowercase, digit
const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ==================== Helpers ====================

const REFRESH_COOKIE_NAME = 'ts_refresh';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function generateTokens(user: { id: string; email: string; plan: string }) {
  const jwtSecret = process.env.JWT_SECRET!;

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, plan: user.plan },
    jwtSecret,
    { expiresIn: JWT_ACCESS_EXPIRY, algorithm: 'HS256' }
  );

  // Create a unique session for refresh token rotation
  const jti = crypto.randomUUID();

  const refreshSecret = process.env.JWT_REFRESH_SECRET!;
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh', jti },
    refreshSecret,
    { expiresIn: JWT_REFRESH_EXPIRY, algorithm: 'HS256' }
  );

  return { accessToken, refreshToken, jti };
}

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/auth/refresh',
  });
}

// ==================== Routes ====================

/**
 * POST /auth/register
 */
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
      },
    });

    const { accessToken, refreshToken, jti } = generateTokens({
      id: user.id,
      email: user.email,
      plan: user.plan,
    });

    // Store refresh token session for rotation
    await prisma.session.create({
      data: {
        sessionToken: jti,
        userId: user.id,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set refresh token as httpOnly cookie (not in response body)
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
      accessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/login
 */
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user?.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const { accessToken, refreshToken, jti } = generateTokens({
      id: user.id,
      email: user.email,
      plan: user.plan,
    });

    // Store refresh token session for rotation
    await prisma.session.create({
      data: {
        sessionToken: jti,
        userId: user.id,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set refresh token as httpOnly cookie (not in response body)
    setRefreshCookie(res, refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/refresh
 * Implements refresh token rotation: each refresh token can only be used once.
 */
router.post('/refresh', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Read refresh token from httpOnly cookie
    const refreshTokenValue = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshTokenValue) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    const payload = jwt.verify(refreshTokenValue, refreshSecret, {
      algorithms: ['HS256'],
    }) as {
      sub: string;
      type: string;
      jti: string;
    };

    if (payload.type !== 'refresh' || !payload.jti) {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    // Refresh token rotation: check if this JTI has already been used
    const session = await prisma.session.findUnique({
      where: { sessionToken: payload.jti },
    });

    if (!session || session.expires < new Date()) {
      // Token reuse detected or session expired - invalidate all sessions for this user
      clearRefreshCookie(res);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Delete the used session (one-time use)
    await prisma.session.delete({ where: { id: session.id } });

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      clearRefreshCookie(res);
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Issue new tokens with a new JTI
    const { accessToken, refreshToken: newRefreshToken, jti } = generateTokens({
      id: user.id,
      email: user.email,
      plan: user.plan,
    });

    // Store the new session
    await prisma.session.create({
      data: {
        sessionToken: jti,
        userId: user.id,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, newRefreshToken);
    res.json({ accessToken });
  } catch {
    clearRefreshCookie(res);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * GET /auth/me
 */
router.get('/me', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        createdAt: true,
        threadsConnection: {
          select: {
            username: true,
            profilePictureUrl: true,
            isVerified: true,
            connectedAt: true,
            lastSyncAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== API Keys ====================

/**
 * GET /auth/api-keys
 */
router.get('/api-keys', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.userId! },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ keys });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/api-keys
 */
router.post('/api-keys', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ error: 'API key name is required' });
      return;
    }

    // Generate a secure random API key
    const rawKey = `ts_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 11); // "ts_" + first 8 hex chars

    await prisma.apiKey.create({
      data: {
        userId: req.userId!,
        name,
        keyHash,
        keyPrefix,
      },
    });

    // Return the raw key once — it cannot be retrieved again
    res.status(201).json({ key: rawKey, prefix: keyPrefix });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /auth/api-keys/:id
 */
router.delete('/api-keys/:id', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.apiKey.deleteMany({
      where: { id: req.params.id, userId: req.userId! },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Threads OAuth ====================

/**
 * GET /auth/threads/connect — Returns OAuth URL
 */
router.get('/threads/connect', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const appId = process.env.THREADS_APP_ID;
  const redirectUri = process.env.THREADS_OAUTH_REDIRECT_URI;

  if (!appId || !redirectUri) {
    res.status(500).json({ error: 'Threads OAuth not configured' });
    return;
  }

  const state = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET!, {
    expiresIn: '10m',
    algorithm: 'HS256',
  });

  const url = new URL(THREADS_OAUTH_URL);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', THREADS_SCOPES.join(','));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);

  res.json({ url: url.toString() });
});

/**
 * GET /auth/threads/callback — OAuth callback handler
 */
router.get('/threads/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    // Verify state to prevent CSRF (pin to HS256)
    const statePayload = jwt.verify(state, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
    }) as {
      userId: string;
    };
    const userId = statePayload.userId;

    // Exchange code for short-lived token
    const tokenUrl = new URL(THREADS_TOKEN_URL);
    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.THREADS_APP_ID!,
        client_secret: process.env.THREADS_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: process.env.THREADS_OAUTH_REDIRECT_URI!,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed (status %d)', tokenResponse.status);
      res.status(400).json({ error: 'Failed to exchange authorization code' });
      return;
    }

    const shortLivedToken = (await tokenResponse.json()) as {
      access_token: string;
      user_id: string;
    };

    // Exchange for long-lived token
    const longLivedToken = await ThreadsApiClient.exchangeForLongLived(
      shortLivedToken.access_token,
      process.env.THREADS_APP_SECRET!
    );

    // Fetch profile info
    const client = new ThreadsApiClient(longLivedToken.access_token);
    const profile = await client.getMyProfile();

    // Store the connection
    const tokenExpiresAt = new Date(
      Date.now() + longLivedToken.expires_in * 1000
    );

    await prisma.threadsConnection.upsert({
      where: { userId },
      create: {
        userId,
        threadsUserId: profile.id,
        username: profile.username,
        profilePictureUrl: profile.threads_profile_picture_url,
        biography: profile.threads_biography,
        isVerified: profile.is_verified ?? false,
        accessToken: encrypt(longLivedToken.access_token),
        tokenExpiresAt,
        scopes: [...THREADS_SCOPES],
      },
      update: {
        threadsUserId: profile.id,
        username: profile.username,
        profilePictureUrl: profile.threads_profile_picture_url,
        biography: profile.threads_biography,
        isVerified: profile.is_verified ?? false,
        accessToken: encrypt(longLivedToken.access_token),
        tokenExpiresAt,
        scopes: [...THREADS_SCOPES],
      },
    });

    // Validate redirect URL to prevent open redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const redirectTarget = new URL('/settings/connections', appUrl);
    redirectTarget.searchParams.set('connected', 'true');
    res.redirect(redirectTarget.toString());
  } catch (error) {
    console.error('Threads OAuth callback error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const redirectTarget = new URL('/settings/connections', appUrl);
    redirectTarget.searchParams.set('error', 'oauth_failed');
    res.redirect(redirectTarget.toString());
  }
});

/**
 * POST /auth/threads/disconnect
 */
router.post('/threads/disconnect', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.threadsConnection.deleteMany({
      where: { userId: req.userId! },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as authRouter };
