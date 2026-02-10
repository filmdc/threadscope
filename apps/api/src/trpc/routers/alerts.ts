import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { alertConfigSchema, PLAN_LIMITS, type PlanTier } from '@threadscope/shared';

export const alertsRouter = router({
  /**
   * List all alerts for the current user.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const alerts = await ctx.prisma.alert.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => ({
      id: a.id,
      type: a.type,
      condition: a.condition as { threshold: number; metric: string; direction: string },
      channels: a.channels,
      isActive: a.isActive,
      lastTriggered: a.lastTriggered?.toISOString() ?? null,
      triggerCount: a.triggerCount,
      trackedKeywordId: a.trackedKeywordId,
      createdAt: a.createdAt.toISOString(),
    }));
  }),

  /**
   * Create a new alert.
   */
  create: protectedProcedure
    .input(alertConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Enforce plan limits
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { plan: true },
      });
      const limits = PLAN_LIMITS[user.plan as PlanTier];
      if (!limits) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Unknown plan tier' });
      }

      const alertCount = await ctx.prisma.alert.count({
        where: { userId: ctx.userId },
      });

      if (alertCount >= limits.maxAlerts) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Your ${user.plan} plan allows a maximum of ${limits.maxAlerts} alerts. Please upgrade or remove existing alerts.`,
        });
      }

      const alert = await ctx.prisma.alert.create({
        data: {
          userId: ctx.userId,
          type: input.type,
          condition: input.condition,
          channels: input.channels,
          trackedKeywordId: input.trackedKeywordId,
        },
      });

      return {
        id: alert.id,
        type: alert.type,
        condition: alert.condition as { threshold: number; metric: string; direction: string },
        channels: alert.channels,
        isActive: alert.isActive,
        lastTriggered: null,
        triggerCount: 0,
        createdAt: alert.createdAt.toISOString(),
      };
    }),

  /**
   * Update an existing alert.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        condition: z.object({
          threshold: z.number(),
          metric: z.string().max(50),
          direction: z.enum(['above', 'below']),
        }).optional(),
        channels: z.array(z.enum(['email', 'push', 'in_app'])).min(1).optional(),
        trackedKeywordId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const alert = await ctx.prisma.alert.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!alert) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Alert not found' });
      }

      const updated = await ctx.prisma.alert.update({
        where: { id: input.id },
        data: {
          ...(input.condition && { condition: input.condition }),
          ...(input.channels && { channels: input.channels }),
          ...(input.trackedKeywordId !== undefined && { trackedKeywordId: input.trackedKeywordId }),
        },
      });

      return {
        id: updated.id,
        type: updated.type,
        condition: updated.condition as { threshold: number; metric: string; direction: string },
        channels: updated.channels,
        isActive: updated.isActive,
      };
    }),

  /**
   * Toggle an alert's active state.
   */
  toggle: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const alert = await ctx.prisma.alert.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!alert) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Alert not found' });
      }

      await ctx.prisma.alert.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });

      return { success: true };
    }),

  /**
   * Remove an alert.
   */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const alert = await ctx.prisma.alert.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!alert) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Alert not found' });
      }

      await ctx.prisma.alert.delete({ where: { id: input.id } });

      return { success: true };
    }),

  /**
   * Get alert trigger history.
   */
  history: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const alert = await ctx.prisma.alert.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!alert) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Alert not found' });
      }

      return {
        id: alert.id,
        type: alert.type,
        lastTriggered: alert.lastTriggered?.toISOString() ?? null,
        triggerCount: alert.triggerCount,
        isActive: alert.isActive,
        createdAt: alert.createdAt.toISOString(),
      };
    }),
});
