import { z } from 'zod';
import crypto from 'crypto';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const settingsRouter = router({
  /**
   * Get current user profile info.
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: {
        name: true,
        email: true,
        plan: true,
        createdAt: true,
      },
    });

    return {
      name: user.name,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt.toISOString(),
    };
  }),

  /**
   * Update user profile.
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().max(254).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.email) {
        const existing = await ctx.prisma.user.findFirst({
          where: { email: input.email, id: { not: ctx.userId } },
        });
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email is already in use by another account',
          });
        }
      }

      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.email !== undefined && { email: input.email }),
        },
      });

      return { success: true };
    }),

  /**
   * Delete account with email confirmation.
   */
  deleteAccount: protectedProcedure
    .input(z.object({ confirmEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { email: true },
      });

      if (input.confirmEmail !== user.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Confirmation email does not match your account email',
        });
      }

      await ctx.prisma.user.delete({ where: { id: ctx.userId } });

      return { success: true };
    }),

  /**
   * List API keys for the current user.
   */
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const keys = await ctx.prisma.apiKey.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));
  }),

  /**
   * Create a new API key. Returns the plaintext key once.
   */
  createApiKey: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      // Generate key: ts_ prefix + 32 random bytes as hex
      const randomBytes = crypto.randomBytes(32).toString('hex');
      const plaintextKey = `ts_${randomBytes}`;
      const keyPrefix = plaintextKey.slice(0, 7);

      // Hash with SHA-256 for storage
      const keyHash = crypto.createHash('sha256').update(plaintextKey).digest('hex');

      await ctx.prisma.apiKey.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          keyHash,
          keyPrefix,
        },
      });

      return {
        key: plaintextKey,
        keyPrefix,
        name: input.name,
      };
    }),

  /**
   * Delete an API key.
   */
  deleteApiKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await ctx.prisma.apiKey.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!key) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'API key not found' });
      }

      await ctx.prisma.apiKey.delete({ where: { id: input.id } });

      return { success: true };
    }),

  /**
   * Disconnect Threads account.
   */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const connection = await ctx.prisma.threadsConnection.findUnique({
      where: { userId: ctx.userId },
    });

    if (!connection) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No Threads account connected',
      });
    }

    await ctx.prisma.threadsConnection.delete({
      where: { userId: ctx.userId },
    });

    return { success: true };
  }),
});
