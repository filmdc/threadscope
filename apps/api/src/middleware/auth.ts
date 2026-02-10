import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/db';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    plan: string;
  };
}

export interface ApiKeyRequest extends Request {
  userId?: string;
  apiKeyId?: string;
}

/**
 * JWT authentication middleware for web app requests
 */
export function authenticateJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as {
      sub: string;
      email: string;
      plan: string;
    };
    req.userId = payload.sub;
    req.user = {
      id: payload.sub,
      email: payload.email,
      plan: payload.plan,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * API key authentication middleware for extension requests
 */
export async function authenticateApiKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (!apiKey) {
    res.status(401).json({ error: 'Missing X-API-Key header' });
    return;
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  try {
    const key = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: { select: { id: true, email: true, plan: true } } },
    });

    if (!key) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      res.status(401).json({ error: 'API key has expired' });
      return;
    }

    // Update last used timestamp (fire and forget)
    prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    req.userId = key.userId;
    req.apiKeyId = key.id;
    next();
  } catch {
    res.status(500).json({ error: 'Authentication error' });
  }
}
