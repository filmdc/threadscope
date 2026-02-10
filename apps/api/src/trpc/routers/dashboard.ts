import { z } from 'zod';
import { router, protectedProcedure, connectedProcedure } from '../trpc';
import { calculateEngagementRate, classifyTrend } from '@threadscope/shared';

export const dashboardRouter = router({
  /**
   * Check whether the current user has a connected Threads account.
   */
  connectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const connection = await ctx.prisma.threadsConnection.findUnique({
      where: { userId: ctx.userId },
      select: {
        username: true,
        profilePictureUrl: true,
        isVerified: true,
        threadsUserId: true,
      },
    });

    return {
      isConnected: !!connection,
      username: connection?.username ?? null,
      profilePictureUrl: connection?.profilePictureUrl ?? null,
      isVerified: connection?.isVerified ?? false,
      threadsUserId: connection?.threadsUserId ?? null,
    };
  }),

  /**
   * Overview metrics for the home dashboard.
   */
  overview: connectedProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(90).default(7),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 7;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const threadsUserId = ctx.connection.threadsUserId;

      // Aggregate account snapshots for the date range
      const snapshots = await ctx.prisma.accountInsightsSnapshot.findMany({
        where: {
          threadsUserId,
          date: { gte: since },
        },
        orderBy: { date: 'asc' },
      });

      // Aggregate post insights
      const posts = await ctx.prisma.postInsight.findMany({
        where: {
          threadsUserId,
          publishedAt: { gte: since },
        },
      });

      const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
      const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
      const totalReplies = posts.reduce((sum, p) => sum + p.replies, 0);
      const totalReposts = posts.reduce((sum, p) => sum + p.reposts, 0);
      const totalQuotes = posts.reduce((sum, p) => sum + p.quotes, 0);
      const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);

      const latestSnapshot = snapshots[snapshots.length - 1];
      const earliestSnapshot = snapshots[0];
      const followersCount = latestSnapshot?.followersCount ?? 0;
      const followerGrowth =
        latestSnapshot && earliestSnapshot
          ? (latestSnapshot.followersCount ?? 0) -
            (earliestSnapshot.followersCount ?? 0)
          : 0;

      const engagementRate = calculateEngagementRate(
        totalLikes,
        totalReplies,
        totalReposts,
        totalQuotes,
        totalViews,
      );

      return {
        views: totalViews,
        likes: totalLikes,
        replies: totalReplies,
        reposts: totalReposts,
        quotes: totalQuotes,
        shares: totalShares,
        followersCount,
        followerGrowth,
        engagementRate,
        postCount: posts.length,
        dateRange: {
          start: since.toISOString(),
          end: new Date().toISOString(),
        },
      };
    }),

  /**
   * Most recent posts for the home dashboard.
   */
  recentPosts: connectedProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.postInsight.findMany({
      where: { threadsUserId: ctx.connection.threadsUserId },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    return posts.map((p) => ({
      id: p.id,
      threadsMediaId: p.threadsMediaId,
      text: p.text ?? '',
      mediaType: p.mediaType,
      permalink: p.permalink ?? '',
      publishedAt: p.publishedAt.toISOString(),
      likes: p.likes,
      replies: p.replies,
      reposts: p.reposts,
      views: p.views,
      engagementRate: p.engagementRate ?? 0,
    }));
  }),

  /**
   * Top 5 trending keywords for the home dashboard.
   */
  trendingSummary: protectedProcedure.query(async ({ ctx }) => {
    const keywords = await ctx.prisma.trackedKeyword.findMany({
      where: { userId: ctx.userId, isActive: true },
      take: 5,
      include: {
        dataPoints: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    return keywords.map((kw) => {
      const dataPoints = kw.dataPoints.reverse();
      const engagementValues = dataPoints.map((dp) => dp.avgEngagement ?? 0);
      const trend = classifyTrend(engagementValues);
      const latest = dataPoints[dataPoints.length - 1];

      return {
        id: kw.id,
        keyword: kw.keyword,
        trend,
        latestPostCount: latest?.postCount ?? 0,
        latestAvgEngagement: latest?.avgEngagement ?? 0,
        sparkline: dataPoints.map((dp) => dp.postCount),
      };
    });
  }),
});
