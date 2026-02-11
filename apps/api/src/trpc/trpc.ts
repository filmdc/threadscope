import { initTRPC, TRPCError } from '@trpc/server';
import { decrypt } from '../lib/encryption';
import { ThreadsApiClient } from '../lib/threads-client';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message:
        error.code === 'INTERNAL_SERVER_ERROR' &&
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : shape.message,
      data: {
        ...shape.data,
        stack:
          process.env.NODE_ENV === 'production' ? undefined : shape.data.stack,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;

/**
 * Public procedure — no authentication required.
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure — requires a valid JWT (ctx.userId must be set).
 */
export const protectedProcedure = t.procedure.use(
  middleware(async ({ ctx, next }) => {
    if (!ctx.userId || !ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }
    return next({
      ctx: { userId: ctx.userId, user: ctx.user },
    });
  }),
);

/**
 * Connected procedure — extends protected, requires an active ThreadsConnection.
 * Decrypts the stored access token and provides a ThreadsApiClient instance.
 */
export const connectedProcedure = protectedProcedure.use(
  middleware(async ({ ctx, next }) => {
    const connection = await ctx.prisma.threadsConnection.findUnique({
      where: { userId: ctx.userId! },
    });

    if (!connection) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'No Threads account connected. Please connect your account first.',
      });
    }

    if (connection.tokenExpiresAt < new Date()) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Threads access token has expired. Please reconnect your account.',
      });
    }

    const accessToken = decrypt(connection.accessToken);
    const threadsClient = new ThreadsApiClient(accessToken);

    return next({
      ctx: { connection, threadsClient },
    });
  }),
);
