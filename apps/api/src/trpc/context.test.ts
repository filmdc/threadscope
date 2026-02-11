import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { createContext } from './context';

// Mock the db module so PrismaClient doesn't try to connect
vi.mock('../lib/db', () => ({
  prisma: {},
}));

const JWT_SECRET = 'test-jwt-secret';

function makeOpts(authHeader?: string): CreateExpressContextOptions {
  return {
    req: {
      headers: {
        authorization: authHeader,
      },
    } as unknown as Request,
    res: {} as any,
    info: {} as any,
  };
}

describe('createContext', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', JWT_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null user when no Authorization header is present', async () => {
    const ctx = await createContext(makeOpts());
    expect(ctx.userId).toBeNull();
    expect(ctx.user).toBeNull();
  });

  it('extracts user from a valid Bearer token', async () => {
    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', plan: 'PRO' },
      JWT_SECRET,
      { algorithm: 'HS256' },
    );
    const ctx = await createContext(makeOpts(`Bearer ${token}`));
    expect(ctx.userId).toBe('user-123');
    expect(ctx.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      plan: 'PRO',
    });
  });

  it('returns null user for an expired token', async () => {
    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', plan: 'PRO' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' },
    );
    const ctx = await createContext(makeOpts(`Bearer ${token}`));
    expect(ctx.userId).toBeNull();
    expect(ctx.user).toBeNull();
  });

  it('returns null user for a malformed token', async () => {
    const ctx = await createContext(makeOpts('Bearer not.a.real.token'));
    expect(ctx.userId).toBeNull();
    expect(ctx.user).toBeNull();
  });

  it('returns null user for non-Bearer auth scheme', async () => {
    const ctx = await createContext(makeOpts('Basic dXNlcjpwYXNz'));
    expect(ctx.userId).toBeNull();
    expect(ctx.user).toBeNull();
  });

  it('returns null user when JWT_SECRET is missing', async () => {
    vi.unstubAllEnvs();
    delete process.env.JWT_SECRET;
    const token = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', plan: 'PRO' },
      'some-secret',
      { algorithm: 'HS256' },
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ctx = await createContext(makeOpts(`Bearer ${token}`));
    expect(ctx.userId).toBeNull();
    expect(ctx.user).toBeNull();
    consoleSpy.mockRestore();
  });
});
