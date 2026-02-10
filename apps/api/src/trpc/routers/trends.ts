import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { keywordSchema, classifyTrend, PLAN_LIMITS } from '@threadscope/shared';
import type { PlanTier } from '@threadscope/shared';
import { TRPCError } from '@trpc/server';
import { keywordTrendQueue } from '../../lib/queue';

export const trendsRouter = router({
  /**
   * List user's tracked keywords with latest 7 data points.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const keywords = await ctx.prisma.trackedKeyword.findMany({
      where: { userId: ctx.userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        dataPoints: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    return keywords.map((kw) => {
      const dataPoints = [...kw.dataPoints].reverse();
      const engagementValues = dataPoints.map((dp) => dp.avgEngagement ?? 0);
      const trend = classifyTrend(engagementValues);
      const latest = dataPoints[dataPoints.length - 1];

      return {
        id: kw.id,
        keyword: kw.keyword,
        isActive: kw.isActive,
        createdAt: kw.createdAt.toISOString(),
        trend,
        latestPostCount: latest?.postCount ?? 0,
        latestAvgEngagement: latest?.avgEngagement ?? 0,
        sparkline: dataPoints.map((dp) => dp.postCount),
        dataPoints: dataPoints.map((dp) => ({
          date: dp.date.toISOString().split('T')[0],
          postCount: dp.postCount,
          totalLikes: dp.totalLikes,
          totalReplies: dp.totalReplies,
          totalReposts: dp.totalReposts,
          avgEngagement: dp.avgEngagement ?? 0,
          sampleSize: dp.sampleSize,
        })),
      };
    });
  }),

  /**
   * Add a new tracked keyword, enforcing plan limits.
   */
  add: protectedProcedure
    .input(z.object({ keyword: keywordSchema }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
        select: { plan: true },
      });

      const limits = PLAN_LIMITS[user.plan as PlanTier];
      const currentCount = await ctx.prisma.trackedKeyword.count({
        where: { userId: ctx.userId, isActive: true },
      });

      if (currentCount >= limits.maxTrackedKeywords) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Your ${user.plan} plan allows a maximum of ${limits.maxTrackedKeywords} tracked keywords. Please upgrade to track more.`,
        });
      }

      // Upsert to reactivate if previously deactivated
      const keyword = await ctx.prisma.trackedKeyword.upsert({
        where: {
          userId_keyword: {
            userId: ctx.userId,
            keyword: input.keyword,
          },
        },
        create: {
          userId: ctx.userId,
          keyword: input.keyword,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });

      // Enqueue an immediate collection job
      await keywordTrendQueue.add(
        'keyword-trend-immediate',
        {
          trackedKeywordId: keyword.id,
          keyword: keyword.keyword,
          userId: ctx.userId,
        },
        { priority: 1 },
      );

      return { id: keyword.id, keyword: keyword.keyword };
    }),

  /**
   * Remove (soft-delete) a tracked keyword.
   */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.trackedKeyword.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isActive: false },
      });
      return { success: true };
    }),

  /**
   * Full detail for a single keyword: time series + top posts/creators.
   */
  detail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const keyword = await ctx.prisma.trackedKeyword.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: {
          dataPoints: {
            orderBy: { date: 'asc' },
            take: 90,
          },
        },
      });

      if (!keyword) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Keyword not found' });
      }

      // Find top posts discovered for this keyword
      const topPosts = await ctx.prisma.publicPost.findMany({
        where: { discoveryKeyword: keyword.keyword },
        orderBy: { likes: 'desc' },
        take: 10,
      });

      // Aggregate top creators from discovered posts
      const creatorMap = new Map<
        string,
        { username: string; postCount: number; totalLikes: number }
      >();
      for (const post of topPosts) {
        const existing = creatorMap.get(post.username) ?? {
          username: post.username,
          postCount: 0,
          totalLikes: 0,
        };
        existing.postCount += 1;
        existing.totalLikes += post.likes;
        creatorMap.set(post.username, existing);
      }

      const topCreators = Array.from(creatorMap.values())
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, 5);

      return {
        id: keyword.id,
        keyword: keyword.keyword,
        isActive: keyword.isActive,
        timeSeries: keyword.dataPoints.map((dp) => ({
          date: dp.date.toISOString().split('T')[0],
          postCount: dp.postCount,
          totalLikes: dp.totalLikes,
          totalReplies: dp.totalReplies,
          totalReposts: dp.totalReposts,
          avgEngagement: dp.avgEngagement ?? 0,
          sampleSize: dp.sampleSize,
        })),
        topPosts: topPosts.map((p) => ({
          threadsMediaId: p.threadsMediaId,
          text: p.text ?? '',
          username: p.username,
          likes: p.likes,
          replies: p.replies,
          reposts: p.reposts,
          publishedAt: p.publishedAt.toISOString(),
          permalink: p.permalink ?? '',
        })),
        topCreators,
      };
    }),
});
