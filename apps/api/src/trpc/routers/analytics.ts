import { z } from 'zod';
import { router, connectedProcedure } from '../trpc';
import { calculateEngagementRate } from '@threadscope/shared';

export const analyticsRouter = router({
  /**
   * Overview metrics for a configurable date range.
   */
  overview: connectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(7),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      const threadsUserId = ctx.connection.threadsUserId;

      // Current period posts
      const posts = await ctx.prisma.postInsight.findMany({
        where: { threadsUserId, publishedAt: { gte: since } },
      });

      // Previous period for comparison
      const prevSince = new Date(since);
      prevSince.setDate(prevSince.getDate() - input.days);
      const prevPosts = await ctx.prisma.postInsight.findMany({
        where: {
          threadsUserId,
          publishedAt: { gte: prevSince, lt: since },
        },
      });

      function sumField(
        items: typeof posts,
        field: 'views' | 'likes' | 'replies' | 'reposts' | 'quotes' | 'shares',
      ) {
        return items.reduce((sum, p) => sum + p[field], 0);
      }

      function pctChange(current: number, previous: number) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      }

      const totalViews = sumField(posts, 'views');
      const totalLikes = sumField(posts, 'likes');
      const totalReplies = sumField(posts, 'replies');
      const totalReposts = sumField(posts, 'reposts');
      const totalQuotes = sumField(posts, 'quotes');
      const totalShares = sumField(posts, 'shares');
      const engagementRate = calculateEngagementRate(
        totalLikes,
        totalReplies,
        totalReposts,
        totalQuotes,
        totalViews,
      );

      // Account snapshots for follower data
      const snapshots = await ctx.prisma.accountInsightsSnapshot.findMany({
        where: { threadsUserId, date: { gte: since } },
        orderBy: { date: 'asc' },
      });
      const latestSnapshot = snapshots[snapshots.length - 1];
      const earliestSnapshot = snapshots[0];
      const followersCount = latestSnapshot?.followersCount ?? 0;
      const followerGrowth =
        latestSnapshot && earliestSnapshot
          ? (latestSnapshot.followersCount ?? 0) -
            (earliestSnapshot.followersCount ?? 0)
          : 0;

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
        changes: {
          views: pctChange(totalViews, sumField(prevPosts, 'views')),
          likes: pctChange(totalLikes, sumField(prevPosts, 'likes')),
          replies: pctChange(totalReplies, sumField(prevPosts, 'replies')),
          engagementRate: pctChange(
            engagementRate,
            calculateEngagementRate(
              sumField(prevPosts, 'likes'),
              sumField(prevPosts, 'replies'),
              sumField(prevPosts, 'reposts'),
              sumField(prevPosts, 'quotes'),
              sumField(prevPosts, 'views'),
            ),
          ),
          postCount: pctChange(posts.length, prevPosts.length),
        },
      };
    }),

  /**
   * Paginated list of post performance data.
   */
  postPerformance: connectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(30),
        sortBy: z
          .enum([
            'publishedAt',
            'views',
            'likes',
            'replies',
            'engagementRate',
          ])
          .default('publishedAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const posts = await ctx.prisma.postInsight.findMany({
        where: {
          threadsUserId: ctx.connection.threadsUserId,
          publishedAt: { gte: since },
        },
        orderBy: { [input.sortBy]: input.sortOrder },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (posts.length > input.limit) {
        const next = posts.pop()!;
        nextCursor = next.id;
      }

      return {
        posts: posts.map((p) => ({
          id: p.id,
          text: p.text ?? '',
          mediaType: p.mediaType,
          permalink: p.permalink ?? '',
          topicTag: p.topicTag,
          publishedAt: p.publishedAt.toISOString(),
          views: p.views,
          likes: p.likes,
          replies: p.replies,
          reposts: p.reposts,
          quotes: p.quotes,
          shares: p.shares,
          clicks: p.clicks,
          engagementRate: p.engagementRate ?? 0,
        })),
        nextCursor,
      };
    }),

  /**
   * Engagement breakdown by media format.
   */
  formatBreakdown: connectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const posts = await ctx.prisma.postInsight.findMany({
        where: {
          threadsUserId: ctx.connection.threadsUserId,
          publishedAt: { gte: since },
        },
      });

      const groups: Record<
        string,
        { count: number; totalEng: number; totalViews: number; totalLikes: number }
      > = {};

      for (const p of posts) {
        const mt = p.mediaType;
        if (!groups[mt]) {
          groups[mt] = { count: 0, totalEng: 0, totalViews: 0, totalLikes: 0 };
        }
        groups[mt].count += 1;
        groups[mt].totalEng += p.engagementRate ?? 0;
        groups[mt].totalViews += p.views;
        groups[mt].totalLikes += p.likes;
      }

      return Object.entries(groups).map(([mediaType, data]) => ({
        mediaType,
        postCount: data.count,
        avgEngagement: data.count > 0 ? data.totalEng / data.count : 0,
        avgViews: data.count > 0 ? Math.round(data.totalViews / data.count) : 0,
        avgLikes: data.count > 0 ? Math.round(data.totalLikes / data.count) : 0,
      }));
    }),

  /**
   * Time-series engagement data for charts.
   */
  engagementTimeSeries: connectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const snapshots = await ctx.prisma.accountInsightsSnapshot.findMany({
        where: {
          threadsUserId: ctx.connection.threadsUserId,
          date: { gte: since },
        },
        orderBy: { date: 'asc' },
      });

      return snapshots.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        views: s.views ?? 0,
        likes: s.likes ?? 0,
        replies: s.replies ?? 0,
        reposts: s.reposts ?? 0,
        followers: s.followersCount ?? 0,
      }));
    }),
});
