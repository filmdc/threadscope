import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db';

export interface ContextUser {
  id: string;
  email: string;
  plan: string;
}

export interface Context {
  userId: string | null;
  user: ContextUser | null;
  prisma: typeof prisma;
}

/**
 * Creates the tRPC context from the Express request.
 * Extracts and verifies the JWT from the Authorization header,
 * replicating the pattern from middleware/auth.ts.
 */
export async function createContext({
  req,
}: CreateExpressContextOptions): Promise<Context> {
  let userId: string | null = null;
  let user: ContextUser | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[CRITICAL] JWT_SECRET is not configured — all authenticated requests will fail');
    } else {
      try {
        const payload = jwt.verify(token, secret, {
          algorithms: ['HS256'],
        }) as { sub: string; email: string; plan: string };

        userId = payload.sub;
        user = { id: payload.sub, email: payload.email, plan: payload.plan };
      } catch {
        // Invalid token — proceed as unauthenticated
      }
    }
  }

  return { userId, user, prisma };
}
