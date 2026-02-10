import { z } from 'zod';
import { router, protectedProcedure, connectedProcedure } from '../trpc';
import { PLAN_LIMITS } from '@threadscope/shared';
import type { PlanTier } from '@threadscope/shared';
import { TRPCError } from '@trpc/server';
import { calculateEngagementRate } from '@threadscope/shared';

export const competitorsRouter = router({
  /**
   * List user's competitors with joined Creator data.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const competitors = await ctx.prisma.competitor.findMany({
      where: { userId: ctx.userId },
      include: { creator: true },
      orderBy: { createdAt: 'desc' },
    });

    return competitors.map((c) => ({
      id: c.id,
      creatorId: c.creator.id,
      username: c.creator.username,
      profilePictureUrl: c.creator.profilePictureUrl ?? '',
      label: c.label ?? c.creator.username,
      avgLikes: c.creator.avgLikes ?? 0,
      avgReplies: c.creator.avgReplies ?? 0,
      avgReposts: c.creator.avgReposts ?? 0,
      avgEngagement: c.creator.avgEngagement ?? 0,
      postFrequency: c.creator.postFrequency ?? '0',
      topTopics: c.creator.primaryTopics,
      lastPostAt: c.creator.lastPostAt?.toISOString() ?? '',
    }));
  }),

  /**
   * Add a competitor by username.
   */
  add: protectedProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(1)
          .max(100)
          .transform((s) => s.replace(/^@/, '')),
        label: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Enforce plan limits
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { plan: true },
      });
      const limits = PLAN_LIMITS[user.plan as PlanTier];
      const currentCount = await ctx.prisma.competitor.count({
        where: { userId: ctx.userId },
      });

      if (currentCount >= limits.maxCompetitors) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Your ${user.plan} plan allows a maximum of ${limits.maxCompetitors} competitors. Please upgrade to track more.`,
        });
      }

      // Find or create the Creator record
      let creator = await ctx.prisma.creator.findFirst({
        where: {
          username: { equals: input.username, mode: 'insensitive' },
        },
      });

      if (!creator) {
        creator = await ctx.prisma.creator.create({
          data: {
            threadsUserId: `pending_${input.username}`,
            username: input.username,
          },
        });
      }

      // Create the Competitor link
      const competitor = await ctx.prisma.competitor.upsert({
        where: {
          userId_creatorId: {
            userId: ctx.userId,
            creatorId: creator.id,
          },
        },
        create: {
          userId: ctx.userId,
          creatorId: creator.id,
          label: input.label,
        },
        update: {
          label: input.label,
        },
        include: { creator: true },
      });

      return {
        id: competitor.id,
        creatorId: competitor.creator.id,
        username: competitor.creator.username,
      };
    }),

  /**
   * Remove a competitor.
   */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.competitor.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });
      return { success: true };
    }),

  /**
   * Benchmark user's post averages vs competitor averages.
   */
  benchmark: connectedProcedure.query(async ({ ctx }) => {
    const threadsUserId = ctx.connection.threadsUserId;

    // User's own post averages (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const myPosts = await ctx.prisma.postInsight.findMany({
      where: { threadsUserId, publishedAt: { gte: since } },
    });

    function avgField(items: typeof myPosts, field: 'likes' | 'replies' | 'reposts') {
      if (items.length === 0) return 0;
      return items.reduce((sum, p) => sum + p[field], 0) / items.length;
    }

    const myViews = myPosts.reduce((sum, p) => sum + p.views, 0);
    const myLikes = myPosts.reduce((sum, p) => sum + p.likes, 0);
    const myReplies = myPosts.reduce((sum, p) => sum + p.replies, 0);
    const myReposts = myPosts.reduce((sum, p) => sum + p.reposts, 0);
    const myQuotes = myPosts.reduce((sum, p) => sum + p.quotes, 0);

    const you = {
      avgLikes: avgField(myPosts, 'likes'),
      avgReplies: avgField(myPosts, 'replies'),
      avgReposts: avgField(myPosts, 'reposts'),
      avgEngagement: calculateEngagementRate(
        myLikes,
        myReplies,
        myReposts,
        myQuotes,
        myViews,
      ),
      postFrequency: myPosts.length,
    };

    // Competitor averages
    const competitors = await ctx.prisma.competitor.findMany({
      where: { userId: ctx.userId },
      include: { creator: true },
    });

    const competitorBenchmarks = competitors.map((c) => ({
      competitorId: c.id,
      username: c.creator.username,
      metrics: {
        avgLikes: c.creator.avgLikes ?? 0,
        avgReplies: c.creator.avgReplies ?? 0,
        avgReposts: c.creator.avgReposts ?? 0,
        avgEngagement: c.creator.avgEngagement ?? 0,
        postFrequency: 0,
      },
    }));

    return { you, competitors: competitorBenchmarks };
  }),
});
