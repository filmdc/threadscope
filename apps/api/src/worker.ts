import { Worker, Job } from 'bullmq';
import { z } from 'zod';
import { createRedisConnection } from './lib/redis';
import { Prisma } from '@prisma/client';
import { prisma } from './lib/db';
import { decrypt, encrypt } from './lib/encryption';
import { ThreadsApiClient } from './lib/threads-client';
import {
  calculateEngagementRate,
  classifyTrend,
  calculatePostScore,
  PLAN_LIMITS,
  type PlanTier,
} from '@threadscope/shared';
import {
  fanOutTokenRefresh,
  fanOutSyncAnalytics,
  fanOutAccountSnapshot,
  fanOutKeywordTrends,
  fanOutCompetitorSnapshots,
  fanOutEngagementSnapshots,
  fanOutAlertEvaluation,
} from './scheduler';

const connection = createRedisConnection();
const concurrency = Math.min(
  parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10),
  50,
);

// ==================== Job Data Schemas ====================

const tokenRefreshSchema = z.object({
  connectionId: z.string().min(1),
});

const userJobSchema = z.object({
  userId: z.string().min(1),
});

const keywordTrendSchema = z.object({
  trackedKeywordId: z.string().min(1),
  keyword: z.string().min(1),
  userId: z.string().min(1),
});

const competitorSnapshotSchema = z.object({
  competitorId: z.string().min(1),
  creatorId: z.string().min(1),
  userId: z.string().min(1),
});

const engagementSnapshotSchema = z.object({
  publicPostId: z.string().min(1),
});

const scheduledPostSchema = z.object({
  scheduledPostId: z.string().min(1),
  userId: z.string().min(1),
});

const alertEvaluationSchema = z.object({
  alertId: z.string().min(1),
});

const reportGenerationSchema = z.object({
  reportId: z.string().min(1),
});

const reportParamsSchema = z.object({
  days: z.number().int().min(1).max(365).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  mediaType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL']).optional(),
  keyword: z.string().max(100).optional(),
  creatorId: z.string().optional(),
});

// ==================== Report Helpers ====================

type ReportResult = {
  summary: Record<string, unknown>;
  data: Record<string, unknown>[];
  count: number;
};

function resolveDateRange(params: z.infer<typeof reportParamsSchema>): { since: Date; until: Date } {
  const until = params.endDate ? new Date(params.endDate) : new Date();
  const since = params.startDate
    ? new Date(params.startDate)
    : new Date(until.getTime() - (params.days ?? 30) * 24 * 60 * 60 * 1000);
  return { since, until };
}

// ==================== Report Generators ====================

async function generateAccountPerformance(
  threadsUserId: string,
  since: Date,
  until: Date,
): Promise<ReportResult> {
  const postAgg = await prisma.postInsight.aggregate({
    where: {
      threadsUserId,
      publishedAt: { gte: since, lte: until },
    },
    _sum: { views: true, likes: true, replies: true, reposts: true, quotes: true, shares: true },
    _avg: { engagementRate: true },
    _count: true,
  });

  const snapshots = await prisma.accountInsightsSnapshot.findMany({
    where: {
      threadsUserId,
      date: { gte: since, lte: until },
    },
    orderBy: { date: 'asc' },
    take: 30,
  });

  return {
    summary: {
      totalPosts: postAgg._count,
      totalViews: postAgg._sum.views ?? 0,
      totalLikes: postAgg._sum.likes ?? 0,
      totalReplies: postAgg._sum.replies ?? 0,
      totalReposts: postAgg._sum.reposts ?? 0,
      totalQuotes: postAgg._sum.quotes ?? 0,
      totalShares: postAgg._sum.shares ?? 0,
      avgEngagementRate: postAgg._avg.engagementRate ?? 0,
    },
    data: snapshots.map((s) => ({
      date: s.date.toISOString(),
      views: s.views,
      likes: s.likes,
      replies: s.replies,
      reposts: s.reposts,
      quotes: s.quotes,
      followersCount: s.followersCount,
    })),
    count: postAgg._count,
  };
}

async function generatePostPerformance(
  threadsUserId: string,
  since: Date,
  until: Date,
  mediaType?: string,
): Promise<ReportResult> {
  const where: Record<string, unknown> = {
    threadsUserId,
    publishedAt: { gte: since, lte: until },
  };
  if (mediaType) where.mediaType = mediaType;

  const posts = await prisma.postInsight.findMany({
    where,
    orderBy: { engagementRate: 'desc' },
    take: 100,
  });

  const scored = posts.map((p) => ({
    id: p.id,
    threadsMediaId: p.threadsMediaId,
    text: p.text?.slice(0, 200),
    mediaType: p.mediaType,
    publishedAt: p.publishedAt.toISOString(),
    views: p.views,
    likes: p.likes,
    replies: p.replies,
    reposts: p.reposts,
    quotes: p.quotes,
    engagementRate: p.engagementRate,
    score: calculatePostScore({
      likes: p.likes,
      replies: p.replies,
      reposts: p.reposts,
      quotes: p.quotes,
      views: p.views,
      shares: p.shares,
      clicks: p.clicks,
    }),
  }));

  scored.sort((a, b) => b.score - a.score);
  const totalScore = scored.reduce((acc, p) => acc + p.score, 0);

  return {
    summary: {
      totalPosts: scored.length,
      avgScore: scored.length > 0 ? totalScore / scored.length : 0,
      topScore: scored[0]?.score ?? 0,
      mediaTypeFilter: mediaType ?? 'all',
    },
    data: scored,
    count: scored.length,
  };
}

async function generateKeywordTrend(
  userId: string,
  since: Date,
  until: Date,
  keyword?: string,
): Promise<ReportResult> {
  const kwWhere: Record<string, unknown> = { userId, isActive: true };
  if (keyword) kwWhere.keyword = { contains: keyword, mode: 'insensitive' };

  const keywords = await prisma.trackedKeyword.findMany({
    where: kwWhere,
    include: {
      dataPoints: {
        where: { date: { gte: since, lte: until } },
        orderBy: { date: 'asc' },
      },
    },
  });

  const data = keywords.map((kw) => {
    const postCounts = kw.dataPoints.map((d) => d.postCount);
    const trend = classifyTrend(postCounts);
    const totalPosts = postCounts.reduce((a, b) => a + b, 0);
    const avgEngagement =
      kw.dataPoints.length > 0
        ? kw.dataPoints.reduce((a, d) => a + (d.avgEngagement ?? 0), 0) / kw.dataPoints.length
        : 0;

    return {
      keywordId: kw.id,
      keyword: kw.keyword,
      trend,
      totalPosts,
      avgEngagement,
      dataPointCount: kw.dataPoints.length,
      timeSeries: kw.dataPoints.map((d) => ({
        date: d.date.toISOString(),
        postCount: d.postCount,
        avgEngagement: d.avgEngagement,
      })),
    };
  });

  return {
    summary: {
      totalKeywords: keywords.length,
      totalDataPoints: data.reduce((a, d) => a + d.dataPointCount, 0),
      risingKeywords: data.filter((d) => d.trend === 'rising').length,
      fallingKeywords: data.filter((d) => d.trend === 'falling').length,
      stableKeywords: data.filter((d) => d.trend === 'stable').length,
    },
    data: data as unknown as Record<string, unknown>[],
    count: keywords.length,
  };
}

async function generateCreatorDiscovery(
  userId: string,
  since: Date,
  until: Date,
  keyword?: string,
): Promise<ReportResult> {
  const postWhere: Record<string, unknown> = {
    publishedAt: { gte: since, lte: until },
    creatorId: { not: null },
  };
  if (keyword) postWhere.discoveryKeyword = { contains: keyword, mode: 'insensitive' };

  const posts = await prisma.publicPost.findMany({
    where: postWhere,
    include: { creator: true },
    orderBy: { likes: 'desc' },
    take: 100,
  });

  // Aggregate by creator
  const creatorMap = new Map<string, {
    creator: typeof posts[0]['creator'];
    postCount: number;
    totalLikes: number;
    totalReplies: number;
    totalReposts: number;
  }>();

  for (const post of posts) {
    if (!post.creator) continue;
    const existing = creatorMap.get(post.creator.id) ?? {
      creator: post.creator,
      postCount: 0,
      totalLikes: 0,
      totalReplies: 0,
      totalReposts: 0,
    };
    existing.postCount++;
    existing.totalLikes += post.likes;
    existing.totalReplies += post.replies;
    existing.totalReposts += post.reposts;
    creatorMap.set(post.creator.id, existing);
  }

  const creators = [...creatorMap.values()]
    .sort((a, b) => (b.totalLikes + b.totalReplies + b.totalReposts) - (a.totalLikes + a.totalReplies + a.totalReposts))
    .slice(0, 50);

  return {
    summary: {
      totalCreatorsFound: creators.length,
      totalPostsAnalyzed: posts.length,
      keywordFilter: keyword ?? 'all',
    },
    data: creators.map((c) => ({
      creatorId: c.creator!.id,
      username: c.creator!.username,
      isVerified: c.creator!.isVerified,
      postCount: c.postCount,
      totalLikes: c.totalLikes,
      totalReplies: c.totalReplies,
      totalReposts: c.totalReposts,
      avgEngagement: c.creator!.avgEngagement,
      primaryTopics: c.creator!.primaryTopics,
    })),
    count: creators.length,
  };
}

async function generateCompetitorBenchmark(
  userId: string,
  threadsUserId: string,
  since: Date,
  until: Date,
): Promise<ReportResult> {
  // User's own averages
  const ownAgg = await prisma.postInsight.aggregate({
    where: {
      threadsUserId,
      publishedAt: { gte: since, lte: until },
    },
    _avg: { likes: true, replies: true, reposts: true, engagementRate: true, views: true },
    _count: true,
  });

  // Competitors
  const competitors = await prisma.competitor.findMany({
    where: { userId },
    include: {
      creator: {
        include: {
          snapshots: {
            where: { capturedAt: { gte: since, lte: until } },
            orderBy: { capturedAt: 'desc' },
            take: 30,
          },
        },
      },
    },
  });

  const competitorData = competitors.map((comp) => ({
    competitorId: comp.id,
    label: comp.label,
    creatorId: comp.creator.id,
    username: comp.creator.username,
    isVerified: comp.creator.isVerified,
    avgLikes: comp.creator.avgLikes,
    avgReplies: comp.creator.avgReplies,
    avgReposts: comp.creator.avgReposts,
    avgEngagement: comp.creator.avgEngagement,
    observedPostCount: comp.creator.observedPostCount,
    snapshots: comp.creator.snapshots.map((s) => ({
      date: s.capturedAt.toISOString(),
      observedPosts: s.observedPosts,
      avgLikes: s.avgLikes,
      avgReplies: s.avgReplies,
      avgEngagement: s.avgEngagement,
    })),
  }));

  return {
    summary: {
      ownPostCount: ownAgg._count,
      ownAvgLikes: ownAgg._avg.likes ?? 0,
      ownAvgReplies: ownAgg._avg.replies ?? 0,
      ownAvgReposts: ownAgg._avg.reposts ?? 0,
      ownAvgEngagement: ownAgg._avg.engagementRate ?? 0,
      ownAvgViews: ownAgg._avg.views ?? 0,
      competitorCount: competitors.length,
    },
    data: competitorData as unknown as Record<string, unknown>[],
    count: competitors.length,
  };
}

async function generateContentAnalysis(
  threadsUserId: string,
  since: Date,
  until: Date,
): Promise<ReportResult> {
  const posts = await prisma.postInsight.findMany({
    where: {
      threadsUserId,
      publishedAt: { gte: since, lte: until },
    },
    take: 100,
    orderBy: { publishedAt: 'desc' },
  });

  // Group by mediaType
  const byMediaType = new Map<string, { count: number; totalLikes: number; totalViews: number; totalEngagement: number }>();
  for (const p of posts) {
    const existing = byMediaType.get(p.mediaType) ?? { count: 0, totalLikes: 0, totalViews: 0, totalEngagement: 0 };
    existing.count++;
    existing.totalLikes += p.likes;
    existing.totalViews += p.views;
    existing.totalEngagement += p.likes + p.replies + p.reposts + p.quotes;
    byMediaType.set(p.mediaType, existing);
  }

  // Group by topicTag
  const byTopic = new Map<string, { count: number; totalLikes: number; totalViews: number; totalEngagement: number }>();
  for (const p of posts) {
    const tag = p.topicTag ?? 'untagged';
    const existing = byTopic.get(tag) ?? { count: 0, totalLikes: 0, totalViews: 0, totalEngagement: 0 };
    existing.count++;
    existing.totalLikes += p.likes;
    existing.totalViews += p.views;
    existing.totalEngagement += p.likes + p.replies + p.reposts + p.quotes;
    byTopic.set(tag, existing);
  }

  const mediaBreakdown = [...byMediaType.entries()].map(([type, stats]) => ({
    mediaType: type,
    count: stats.count,
    avgLikes: stats.count > 0 ? stats.totalLikes / stats.count : 0,
    avgViews: stats.count > 0 ? stats.totalViews / stats.count : 0,
    avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
  }));

  const topicBreakdown = [...byTopic.entries()]
    .map(([tag, stats]) => ({
      topicTag: tag,
      count: stats.count,
      avgLikes: stats.count > 0 ? stats.totalLikes / stats.count : 0,
      avgViews: stats.count > 0 ? stats.totalViews / stats.count : 0,
      avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  return {
    summary: {
      totalPosts: posts.length,
      mediaTypes: mediaBreakdown.length,
      topicTags: topicBreakdown.length,
      bestMediaType: mediaBreakdown.sort((a, b) => b.avgEngagement - a.avgEngagement)[0]?.mediaType ?? null,
      bestTopic: topicBreakdown[0]?.topicTag ?? null,
    },
    data: [
      ...mediaBreakdown.map((m) => ({ section: 'mediaType' as const, ...m })),
      ...topicBreakdown.map((t) => ({ section: 'topicTag' as const, ...t })),
    ],
    count: posts.length,
  };
}

async function generateAudienceInsights(
  threadsUserId: string,
  since: Date,
  until: Date,
): Promise<ReportResult> {
  const snapshots = await prisma.accountInsightsSnapshot.findMany({
    where: {
      threadsUserId,
      date: { gte: since, lte: until },
    },
    orderBy: { date: 'asc' },
    take: 30,
  });

  const followerCounts = snapshots
    .filter((s) => s.followersCount != null)
    .map((s) => s.followersCount!);

  const followerTrend = classifyTrend(followerCounts);
  const latestSnapshot = snapshots[snapshots.length - 1];
  const earliestSnapshot = snapshots[0];

  const followerGrowth =
    earliestSnapshot?.followersCount && latestSnapshot?.followersCount
      ? latestSnapshot.followersCount - earliestSnapshot.followersCount
      : 0;

  return {
    summary: {
      followerTrend,
      followerGrowth,
      latestFollowers: latestSnapshot?.followersCount ?? null,
      snapshotCount: snapshots.length,
      followersByCountry: latestSnapshot?.followersByCountry ?? null,
      followersByCity: latestSnapshot?.followersByCity ?? null,
      followersByAge: latestSnapshot?.followersByAge ?? null,
      followersByGender: latestSnapshot?.followersByGender ?? null,
    },
    data: snapshots.map((s) => ({
      date: s.date.toISOString(),
      followersCount: s.followersCount,
      views: s.views,
      likes: s.likes,
      replies: s.replies,
    })),
    count: snapshots.length,
  };
}

async function generateTopicLandscape(
  userId: string,
  since: Date,
  until: Date,
): Promise<ReportResult> {
  // Get keyword trends for the user
  const keywords = await prisma.trackedKeyword.findMany({
    where: { userId, isActive: true },
    include: {
      dataPoints: {
        where: { date: { gte: since, lte: until } },
        orderBy: { date: 'asc' },
      },
    },
  });

  const keywordSummaries = keywords.map((kw) => {
    const postCounts = kw.dataPoints.map((d) => d.postCount);
    const trend = classifyTrend(postCounts);
    const totalPosts = postCounts.reduce((a, b) => a + b, 0);
    return { keyword: kw.keyword, trend, totalPosts };
  });

  // Get top public posts with topic tags
  const posts = await prisma.publicPost.findMany({
    where: {
      publishedAt: { gte: since, lte: until },
      topicTag: { not: null },
      OR: [
        { trackedBy: { some: { userId } } },
        { creator: { trackedBy: { some: { userId } } } },
        { discoveryKeyword: { not: null } },
      ],
    },
    include: { creator: true },
    orderBy: { likes: 'desc' },
    take: 100,
  });

  // Aggregate by topicTag
  const byTopic = new Map<string, { count: number; totalEngagement: number; creators: Set<string> }>();
  for (const p of posts) {
    const tag = p.topicTag!;
    const existing = byTopic.get(tag) ?? { count: 0, totalEngagement: 0, creators: new Set<string>() };
    existing.count++;
    existing.totalEngagement += p.likes + p.replies + p.reposts;
    if (p.creator) existing.creators.add(p.creator.username);
    byTopic.set(tag, existing);
  }

  const topicData = [...byTopic.entries()]
    .map(([tag, stats]) => ({
      topicTag: tag,
      postCount: stats.count,
      totalEngagement: stats.totalEngagement,
      avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
      uniqueCreators: stats.creators.size,
    }))
    .sort((a, b) => b.totalEngagement - a.totalEngagement);

  return {
    summary: {
      totalTopics: topicData.length,
      totalKeywords: keywords.length,
      risingKeywords: keywordSummaries.filter((k) => k.trend === 'rising').length,
      topTopic: topicData[0]?.topicTag ?? null,
    },
    data: [
      ...topicData.map((t) => ({ section: 'topic' as const, ...t })),
      ...keywordSummaries.map((k) => ({ section: 'keyword' as const, ...k })),
    ] as unknown as Record<string, unknown>[],
    count: topicData.length + keywordSummaries.length,
  };
}

// ==================== Job Processors ====================

async function processTokenRefresh(job: Job): Promise<void> {
  // Handle scheduler fan-out (no connectionId means it's the repeatable trigger)
  if (!job.data.connectionId) {
    await fanOutTokenRefresh();
    return;
  }

  const { connectionId } = tokenRefreshSchema.parse(job.data);
  console.log(`[token-refresh] Refreshing token for: ${connectionId}`);

  const conn = await prisma.threadsConnection.findUnique({
    where: { id: connectionId },
  });

  if (!conn) {
    console.log(`[token-refresh] Connection ${connectionId} not found, skipping`);
    return;
  }

  const currentToken = decrypt(conn.accessToken);
  const tokenResponse = await ThreadsApiClient.refreshToken(currentToken);

  const newExpiresAt = new Date(
    Date.now() + tokenResponse.expires_in * 1000,
  );

  // Use updateMany with a version check to prevent TOCTOU race:
  // Only update if the token hasn't been changed by another concurrent refresh.
  const updated = await prisma.threadsConnection.updateMany({
    where: {
      id: connectionId,
      accessToken: conn.accessToken,
    },
    data: {
      accessToken: encrypt(tokenResponse.access_token),
      tokenExpiresAt: newExpiresAt,
    },
  });

  if (updated.count === 0) {
    console.log(`[token-refresh] Token for ${connectionId} was already refreshed by another job, skipping`);
    return;
  }

  console.log(`[token-refresh] Token refreshed for ${conn.username}, expires ${newExpiresAt.toISOString()}`);
}

async function processSyncAnalytics(job: Job): Promise<void> {
  // Handle scheduler fan-out
  if (!job.data.userId) {
    await fanOutSyncAnalytics();
    return;
  }

  const { userId } = userJobSchema.parse(job.data);
  console.log(`[sync-own-analytics] Processing for user: ${userId}`);

  const conn = await prisma.threadsConnection.findUnique({
    where: { userId },
  });

  if (!conn) {
    console.log(`[sync-own-analytics] No connection for user ${userId}`);
    return;
  }

  const accessToken = decrypt(conn.accessToken);
  const client = new ThreadsApiClient(accessToken);

  // Fetch recent threads
  const threadsResponse = await client.getMyThreads({ limit: 25 });
  const threads = threadsResponse.data;

  for (const thread of threads) {
    // Fetch insights for each post
    const insights = { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0, shares: 0, clicks: 0 };
    try {
      const insightsResponse = await client.getMediaInsights(thread.id, [
        'views',
        'likes',
        'replies',
        'reposts',
        'quotes',
        'shares',
      ]);
      for (const metric of insightsResponse.data) {
        const value = metric.values[0]?.value ?? 0;
        if (metric.name in insights) {
          (insights as Record<string, number>)[metric.name] = value;
        }
      }
    } catch (err) {
      console.warn(`[sync-own-analytics] Failed to fetch insights for ${thread.id}:`, (err as Error).message);
      continue;
    }

    const engagementRate = calculateEngagementRate(
      insights.likes,
      insights.replies,
      insights.reposts,
      insights.quotes,
      insights.views,
    );

    // Upsert PostInsight
    const postInsight = await prisma.postInsight.upsert({
      where: { threadsMediaId: thread.id },
      create: {
        threadsMediaId: thread.id,
        threadsUserId: conn.threadsUserId,
        text: thread.text,
        mediaType: ((thread.media_type ?? 'TEXT') as 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'),
        permalink: thread.permalink,
        topicTag: thread.topic_tag,
        publishedAt: thread.timestamp ? new Date(thread.timestamp) : new Date(),
        views: insights.views,
        likes: insights.likes,
        replies: insights.replies,
        reposts: insights.reposts,
        quotes: insights.quotes,
        shares: insights.shares,
        clicks: insights.clicks,
        engagementRate,
        lastSyncAt: new Date(),
      },
      update: {
        views: insights.views,
        likes: insights.likes,
        replies: insights.replies,
        reposts: insights.reposts,
        quotes: insights.quotes,
        shares: insights.shares,
        clicks: insights.clicks,
        engagementRate,
        lastSyncAt: new Date(),
      },
    });

    // Create PostInsightSnapshot
    await prisma.postInsightSnapshot.create({
      data: {
        postInsightId: postInsight.id,
        views: insights.views,
        likes: insights.likes,
        replies: insights.replies,
        reposts: insights.reposts,
        quotes: insights.quotes,
        shares: insights.shares,
        clicks: insights.clicks,
      },
    });
  }

  // Update last sync time
  await prisma.threadsConnection.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });

  console.log(`[sync-own-analytics] Synced ${threads.length} posts for ${conn.username}`);
}

async function processAccountSnapshot(job: Job): Promise<void> {
  // Handle scheduler fan-out
  if (!job.data.userId) {
    await fanOutAccountSnapshot();
    return;
  }

  const { userId } = userJobSchema.parse(job.data);
  console.log(`[account-snapshot] Processing for user: ${userId}`);

  const conn = await prisma.threadsConnection.findUnique({
    where: { userId },
  });

  if (!conn) {
    console.log(`[account-snapshot] No connection for user ${userId}`);
    return;
  }

  const accessToken = decrypt(conn.accessToken);
  const client = new ThreadsApiClient(accessToken);

  // Fetch user insights
  const insightsResponse = await client.getUserInsights({
    metric: ['views', 'likes', 'replies', 'reposts', 'quotes', 'followers_count'],
  });

  const values: Record<string, number> = {};
  for (const metric of insightsResponse.data) {
    const val = metric.values[0]?.value;
    if (typeof val === 'number') {
      values[metric.name] = val;
    }
  }

  // Fetch demographics if enough followers
  let demographics: {
    followersByCountry?: Record<string, number>;
    followersByCity?: Record<string, number>;
    followersByAge?: Record<string, number>;
    followersByGender?: Record<string, number>;
  } = {};

  if ((values.followers_count ?? 0) >= 100) {
    try {
      const demoResponse = await client.getUserInsights({
        metric: ['follower_demographics'],
        breakdown: 'country',
      });
      if (demoResponse.data[0]) {
        const demoValue = demoResponse.data[0].values[0]?.value;
        if (typeof demoValue === 'object' && demoValue !== null) {
          demographics.followersByCountry = demoValue as Record<string, number>;
        }
      }
    } catch {
      // Demographics may not be available
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.accountInsightsSnapshot.upsert({
    where: {
      threadsUserId_date: {
        threadsUserId: conn.threadsUserId,
        date: today,
      },
    },
    create: {
      threadsUserId: conn.threadsUserId,
      date: today,
      views: values.views ?? null,
      likes: values.likes ?? null,
      replies: values.replies ?? null,
      reposts: values.reposts ?? null,
      quotes: values.quotes ?? null,
      followersCount: values.followers_count ?? null,
      followersByCountry: demographics.followersByCountry ?? undefined,
      followersByCity: demographics.followersByCity ?? undefined,
      followersByAge: demographics.followersByAge ?? undefined,
      followersByGender: demographics.followersByGender ?? undefined,
    },
    update: {
      views: values.views ?? null,
      likes: values.likes ?? null,
      replies: values.replies ?? null,
      reposts: values.reposts ?? null,
      quotes: values.quotes ?? null,
      followersCount: values.followers_count ?? null,
      followersByCountry: demographics.followersByCountry ?? undefined,
    },
  });

  console.log(`[account-snapshot] Snapshot saved for ${conn.username}`);
}

async function processKeywordTrend(job: Job): Promise<void> {
  // Handle scheduler fan-out
  if (!job.data.trackedKeywordId) {
    await fanOutKeywordTrends();
    return;
  }

  const { trackedKeywordId, keyword, userId } = keywordTrendSchema.parse(job.data);
  console.log(`[keyword-trend] Processing keyword: ${keyword.slice(0, 100)}`);

  const conn = await prisma.threadsConnection.findUnique({
    where: { userId },
  });

  if (!conn) {
    console.log(`[keyword-trend] No connection for user ${userId}, skipping`);
    return;
  }

  const accessToken = decrypt(conn.accessToken);
  const client = new ThreadsApiClient(accessToken);

  // Search for today's window
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  const searchResult = await client.keywordSearch({
    q: keyword,
    since: dayAgo,
    until: now,
  });

  const posts = searchResult.data;

  // Aggregate
  let totalLikes = 0;
  let totalReplies = 0;
  let totalReposts = 0;

  for (const post of posts) {
    totalLikes += post.likes ?? 0;
    totalReplies += post.replies ?? 0;
    totalReposts += post.reposts ?? 0;
  }

  const totalEngagement = totalLikes + totalReplies + totalReposts;
  const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert KeywordTrendData
  await prisma.keywordTrendData.upsert({
    where: {
      trackedKeywordId_date: {
        trackedKeywordId,
        date: today,
      },
    },
    create: {
      trackedKeywordId,
      date: today,
      postCount: posts.length,
      totalLikes,
      totalReplies,
      totalReposts,
      avgEngagement,
      sampleSize: posts.length,
    },
    update: {
      postCount: posts.length,
      totalLikes,
      totalReplies,
      totalReposts,
      avgEngagement,
      sampleSize: posts.length,
    },
  });

  // Upsert public posts and creators discovered (cap at 50)
  for (const post of posts.slice(0, 50)) {
    let creatorId: string | undefined;
    if (post.username) {
      const creator = await prisma.creator.upsert({
        where: { threadsUserId: post.id.split('_')[0] ?? post.username },
        create: {
          threadsUserId: post.id.split('_')[0] ?? post.username,
          username: post.username,
        },
        update: {
          lastSeenAt: new Date(),
        },
      });
      creatorId = creator.id;
    }

    await prisma.publicPost.upsert({
      where: { threadsMediaId: post.id },
      create: {
        threadsMediaId: post.id,
        creatorId,
        username: post.username ?? 'unknown',
        text: post.text,
        mediaType: ((post.media_type ?? 'TEXT') as 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'),
        permalink: post.permalink,
        topicTag: post.topic_tag,
        publishedAt: post.timestamp ? new Date(post.timestamp) : new Date(),
        likes: post.likes ?? 0,
        replies: post.replies ?? 0,
        reposts: post.reposts ?? 0,
        discoveredVia: 'keyword_search',
        discoveryKeyword: keyword,
      },
      update: {
        likes: post.likes ?? 0,
        replies: post.replies ?? 0,
        reposts: post.reposts ?? 0,
        lastSeenAt: new Date(),
      },
    });
  }

  console.log(`[keyword-trend] Processed ${posts.length} posts for keyword`);
}

async function processCompetitorSnapshot(job: Job): Promise<void> {
  // Fan-out handler
  if (!job.data.competitorId) {
    await fanOutCompetitorSnapshots();
    return;
  }

  const { competitorId, creatorId, userId } = competitorSnapshotSchema.parse(job.data);
  console.log(`[competitor-snapshot] Processing competitor: ${creatorId}`);

  const conn = await prisma.threadsConnection.findUnique({
    where: { userId },
  });

  if (!conn) {
    console.log(`[competitor-snapshot] No connection for user ${userId}, skipping`);
    return;
  }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
  });

  if (!creator) {
    console.log(`[competitor-snapshot] Creator ${creatorId} not found, skipping`);
    return;
  }

  const accessToken = decrypt(conn.accessToken);
  const client = new ThreadsApiClient(accessToken);

  // Search for recent posts by this creator
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  let posts: Array<{
    id: string; text?: string; timestamp?: string; media_type?: string;
    permalink?: string; username?: string; topic_tag?: string;
    likes?: number; replies?: number; reposts?: number;
    link_attachment_url?: string;
  }> = [];

  try {
    const searchResult = await client.keywordSearch({
      q: `from:${creator.username}`,
      since: dayAgo,
      until: now,
    });
    posts = searchResult.data;
  } catch (err) {
    console.warn(`[competitor-snapshot] Search failed for ${creator.username}:`, (err as Error).message);
  }

  // Aggregate metrics
  let totalLikes = 0;
  let totalReplies = 0;
  let totalReposts = 0;

  for (const post of posts) {
    totalLikes += post.likes ?? 0;
    totalReplies += post.replies ?? 0;
    totalReposts += post.reposts ?? 0;
  }

  const avgLikes = posts.length > 0 ? totalLikes / posts.length : (creator.avgLikes ?? 0);
  const avgReplies = posts.length > 0 ? totalReplies / posts.length : (creator.avgReplies ?? 0);
  const avgReposts = posts.length > 0 ? totalReposts / posts.length : (creator.avgReposts ?? 0);
  const totalEngagement = totalLikes + totalReplies + totalReposts;
  const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : (creator.avgEngagement ?? 0);

  // Update Creator record
  await prisma.creator.update({
    where: { id: creatorId },
    data: {
      avgLikes,
      avgReplies,
      avgReposts,
      avgEngagement,
      observedPostCount: creator.observedPostCount + posts.length,
      lastPostAt: posts.length > 0 && posts[0]?.timestamp
        ? new Date(posts[0].timestamp)
        : creator.lastPostAt,
      lastSeenAt: new Date(),
    },
  });

  // Create CreatorSnapshot for time-series history
  await prisma.creatorSnapshot.create({
    data: {
      creatorId,
      observedPosts: posts.length,
      avgLikes,
      avgReplies,
      avgReposts,
      avgEngagement,
    },
  });

  // Upsert PublicPost records for discovered posts (cap at 50)
  for (const post of posts.slice(0, 50)) {
    await prisma.publicPost.upsert({
      where: { threadsMediaId: post.id },
      create: {
        threadsMediaId: post.id,
        creatorId,
        username: post.username ?? creator.username,
        text: post.text,
        mediaType: ((post.media_type ?? 'TEXT') as 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'),
        permalink: post.permalink,
        topicTag: post.topic_tag,
        publishedAt: post.timestamp ? new Date(post.timestamp) : new Date(),
        likes: post.likes ?? 0,
        replies: post.replies ?? 0,
        reposts: post.reposts ?? 0,
        discoveredVia: 'competitor_snapshot',
      },
      update: {
        likes: post.likes ?? 0,
        replies: post.replies ?? 0,
        reposts: post.reposts ?? 0,
        lastSeenAt: new Date(),
      },
    });
  }

  console.log(`[competitor-snapshot] Processed ${posts.length} posts for ${creator.username}`);
}

async function processEngagementSnapshot(job: Job): Promise<void> {
  // Fan-out handler
  if (!job.data.publicPostId) {
    await fanOutEngagementSnapshots();
    return;
  }

  const { publicPostId } = engagementSnapshotSchema.parse(job.data);
  console.log(`[engagement-snapshot] Processing post: ${publicPostId}`);

  const publicPost = await prisma.publicPost.findUnique({
    where: { id: publicPostId },
    include: {
      trackedBy: { select: { userId: true } },
      creator: { include: { trackedBy: { select: { userId: true } } } },
    },
  });

  if (!publicPost) {
    console.log(`[engagement-snapshot] Post ${publicPostId} not found, skipping`);
    return;
  }

  // Find a user with a connection to fetch data
  const trackerUserIds = [
    ...publicPost.trackedBy.map((t) => t.userId),
    ...(publicPost.creator?.trackedBy.map((t) => t.userId) ?? []),
  ];

  let conn = null;
  for (const uid of trackerUserIds) {
    conn = await prisma.threadsConnection.findUnique({ where: { userId: uid } });
    if (conn) break;
  }

  if (!conn) {
    console.log(`[engagement-snapshot] No connection available for post ${publicPostId}, skipping`);
    return;
  }

  const accessToken = decrypt(conn.accessToken);
  const client = new ThreadsApiClient(accessToken);

  try {
    // Try keyword search to get updated engagement counts
    const searchResult = await client.keywordSearch({
      q: publicPost.text?.slice(0, 50) ?? publicPost.username,
    });

    const matchedPost = searchResult.data.find((p) => p.id === publicPost.threadsMediaId);

    if (matchedPost) {
      const likes = matchedPost.likes ?? publicPost.likes;
      const replies = matchedPost.replies ?? publicPost.replies;
      const reposts = matchedPost.reposts ?? publicPost.reposts;

      // Create snapshot
      await prisma.publicPostSnapshot.create({
        data: {
          publicPostId,
          likes,
          replies,
          reposts,
        },
      });

      // Update PublicPost
      await prisma.publicPost.update({
        where: { id: publicPostId },
        data: {
          likes,
          replies,
          reposts,
          lastSeenAt: new Date(),
        },
      });

      console.log(`[engagement-snapshot] Updated post ${publicPostId}: ${likes}L/${replies}R/${reposts}RP`);
    } else {
      // Still create a snapshot with current known values
      await prisma.publicPostSnapshot.create({
        data: {
          publicPostId,
          likes: publicPost.likes,
          replies: publicPost.replies,
          reposts: publicPost.reposts,
        },
      });
      console.log(`[engagement-snapshot] Post not found in search, snapshot saved with existing values`);
    }
  } catch (err) {
    console.warn(`[engagement-snapshot] Failed to fetch engagement for ${publicPostId}:`, (err as Error).message);
  }
}

async function processScheduledPost(job: Job): Promise<void> {
  const { scheduledPostId, userId } = scheduledPostSchema.parse(job.data);
  console.log(`[scheduled-post] Publishing: ${scheduledPostId}`);

  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
  });

  if (!post || post.status !== 'PENDING') {
    console.log(`[scheduled-post] Post ${scheduledPostId} not found or not pending, skipping`);
    return;
  }

  // Set status to PUBLISHING
  await prisma.scheduledPost.update({
    where: { id: scheduledPostId },
    data: { status: 'PUBLISHING' },
  });

  const conn = await prisma.threadsConnection.findUnique({
    where: { userId },
  });

  if (!conn) {
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { status: 'FAILED', errorMessage: 'No Threads account connected' },
    });
    return;
  }

  const accessToken = decrypt(conn.accessToken);
  const client = new ThreadsApiClient(accessToken);

  try {
    const result = await client.publishPost({
      user_id: conn.threadsUserId,
      media_type: post.mediaType as 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL',
      text: post.text,
      image_url: post.mediaUrls[0],
      video_url: post.mediaType === 'VIDEO' ? post.mediaUrls[0] : undefined,
      reply_to_id: post.replyToId ?? undefined,
      reply_control: post.replyControl as 'everyone' | 'accounts_you_follow' | 'mentioned_only' | undefined,
      topic_tag: post.topicTag ?? undefined,
      link_attachment_url: post.linkUrl ?? undefined,
      poll: post.pollOptions.length > 0
        ? { options: post.pollOptions, duration: post.pollDuration ?? 86400 }
        : undefined,
    });

    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        status: 'PUBLISHED',
        threadsMediaId: result.id,
        publishedAt: new Date(),
      },
    });

    console.log(`[scheduled-post] Successfully published ${scheduledPostId} as ${result.id}`);
  } catch (err) {
    // Mark failed in DB instead of triggering BullMQ retries
    const errorMessage = err instanceof Error ? err.message : 'Unknown publishing error';
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { status: 'FAILED', errorMessage },
    });
    console.error(`[scheduled-post] Failed to publish ${scheduledPostId}:`, errorMessage);
  }
}

async function processAlertEvaluation(job: Job): Promise<void> {
  // Fan-out handler
  if (!job.data.alertId) {
    await fanOutAlertEvaluation();
    return;
  }

  const { alertId } = alertEvaluationSchema.parse(job.data);
  console.log(`[alert-evaluation] Evaluating alert: ${alertId}`);

  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { trackedKeyword: { include: { dataPoints: { orderBy: { date: 'desc' }, take: 2 } } } },
  });

  if (!alert || !alert.isActive) {
    console.log(`[alert-evaluation] Alert ${alertId} not found or inactive, skipping`);
    return;
  }

  const condition = alert.condition as { threshold?: number; metric?: string; direction?: string };
  let triggered = false;

  switch (alert.type) {
    case 'KEYWORD_SPIKE': {
      const latest = alert.trackedKeyword?.dataPoints[0];
      if (latest && condition.threshold != null) {
        triggered = latest.postCount > condition.threshold;
      }
      break;
    }

    case 'KEYWORD_TREND_CHANGE': {
      const points = alert.trackedKeyword?.dataPoints;
      if (points && points.length >= 2) {
        const current = points[0]!.avgEngagement ?? 0;
        const previous = points[1]!.avgEngagement ?? 0;
        const wasRising = previous > 0;
        const isNowFalling = current < previous;
        // Trigger on direction flip
        triggered = (wasRising && isNowFalling) || (!wasRising && current > previous);
      }
      break;
    }

    case 'ENGAGEMENT_MILESTONE': {
      if (condition.threshold != null && condition.metric) {
        const conn = await prisma.threadsConnection.findFirst({
          where: { userId: alert.userId },
        });
        if (conn) {
          const latestPost = await prisma.postInsight.findFirst({
            where: { threadsUserId: conn.threadsUserId },
            orderBy: { lastSyncAt: 'desc' },
          });
          if (latestPost) {
            const value = (latestPost as Record<string, unknown>)[condition.metric];
            if (typeof value === 'number') {
              triggered = condition.direction === 'below'
                ? value < condition.threshold
                : value > condition.threshold;
            }
          }
        }
      }
      break;
    }

    case 'FOLLOWER_MILESTONE': {
      if (condition.threshold != null) {
        const conn = await prisma.threadsConnection.findFirst({
          where: { userId: alert.userId },
        });
        if (conn) {
          const latestSnapshot = await prisma.accountInsightsSnapshot.findFirst({
            where: { threadsUserId: conn.threadsUserId },
            orderBy: { date: 'desc' },
          });
          if (latestSnapshot?.followersCount != null) {
            triggered = latestSnapshot.followersCount > condition.threshold;
          }
        }
      }
      break;
    }

    case 'COMPETITOR_POST': {
      const competitors = await prisma.competitor.findMany({
        where: { userId: alert.userId },
        include: { creator: true },
      });
      for (const comp of competitors) {
        if (comp.creator.lastPostAt && alert.lastTriggered) {
          if (comp.creator.lastPostAt > alert.lastTriggered) {
            triggered = true;
            break;
          }
        } else if (comp.creator.lastPostAt && !alert.lastTriggered) {
          triggered = true;
          break;
        }
      }
      break;
    }

    case 'MENTION_ALERT': {
      // MENTION_ALERT is triggered directly from webhook processing, not periodic evaluation
      break;
    }
  }

  if (triggered) {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        lastTriggered: new Date(),
        triggerCount: { increment: 1 },
      },
    });

    // Deliver via channels
    const channels = alert.channels as string[];
    for (const channel of channels) {
      switch (channel) {
        case 'in_app':
          // Badge count is query-based, no action needed
          break;
        case 'email':
          console.log(`[alert-evaluation] Email notification placeholder for alert ${alertId}`);
          break;
        case 'push':
          console.log(`[alert-evaluation] Push notification placeholder for alert ${alertId}`);
          break;
      }
    }

    console.log(`[alert-evaluation] Alert ${alertId} (${alert.type}) triggered`);
  }
}

async function processReportGeneration(job: Job): Promise<void> {
  const { reportId } = reportGenerationSchema.parse(job.data);
  console.log(`[report-generation] Generating report: ${reportId}`);

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.status === 'CANCELLED') {
    console.log(`[report-generation] Report ${reportId} not found or cancelled, skipping`);
    return;
  }

  const startTime = Date.now();

  await prisma.report.update({
    where: { id: reportId },
    data: { status: 'PROCESSING' },
  });

  try {
    const params = reportParamsSchema.parse(report.parameters);
    const { since, until } = resolveDateRange(params);

    // Look up connection (nullable — some reports don't need it)
    const conn = await prisma.threadsConnection.findUnique({
      where: { userId: report.userId },
    });

    const requiresConnection = [
      'ACCOUNT_PERFORMANCE',
      'POST_PERFORMANCE',
      'COMPETITOR_BENCHMARK',
      'CONTENT_ANALYSIS',
      'AUDIENCE_INSIGHTS',
    ].includes(report.type);

    if (requiresConnection && !conn) {
      throw new Error('No Threads account connected. This report type requires an active connection.');
    }

    let result: ReportResult;

    switch (report.type) {
      case 'ACCOUNT_PERFORMANCE':
        result = await generateAccountPerformance(conn!.threadsUserId, since, until);
        break;
      case 'POST_PERFORMANCE':
        result = await generatePostPerformance(conn!.threadsUserId, since, until, params.mediaType);
        break;
      case 'KEYWORD_TREND':
        result = await generateKeywordTrend(report.userId, since, until, params.keyword);
        break;
      case 'CREATOR_DISCOVERY':
        result = await generateCreatorDiscovery(report.userId, since, until, params.keyword);
        break;
      case 'COMPETITOR_BENCHMARK':
        result = await generateCompetitorBenchmark(report.userId, conn!.threadsUserId, since, until);
        break;
      case 'CONTENT_ANALYSIS':
        result = await generateContentAnalysis(conn!.threadsUserId, since, until);
        break;
      case 'AUDIENCE_INSIGHTS':
        result = await generateAudienceInsights(conn!.threadsUserId, since, until);
        break;
      case 'TOPIC_LANDSCAPE':
        result = await generateTopicLandscape(report.userId, since, until);
        break;
      default:
        throw new Error(`Unknown report type: ${report.type}`);
    }

    const processingTime = Date.now() - startTime;

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        resultSummary: result.summary as unknown as Prisma.InputJsonValue,
        resultData: result.data as unknown as Prisma.InputJsonValue,
        resultCount: result.count,
        processingTime,
        completedAt: new Date(),
      },
    });

    console.log(`[report-generation] Report ${reportId} (${report.type}) completed in ${processingTime}ms`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const processingTime = Date.now() - startTime;

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'FAILED',
        errorMessage,
        processingTime,
      },
    });

    console.error(`[report-generation] Report ${reportId} failed:`, errorMessage);
  }
}

async function processDataCleanup(_job: Job): Promise<void> {
  console.log('[data-cleanup] Starting data cleanup');
  const startTime = Date.now();

  // 1. Per-user cleanup based on plan limits
  const users = await prisma.user.findMany({
    select: { id: true, plan: true },
  });

  for (const user of users) {
    const limits = PLAN_LIMITS[user.plan as PlanTier];
    if (!limits) continue;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - limits.historyDays);

    const conn = await prisma.threadsConnection.findUnique({
      where: { userId: user.id },
      select: { threadsUserId: true },
    });

    if (conn) {
      // Delete old PostInsightSnapshots
      const postInsights = await prisma.postInsight.findMany({
        where: { threadsUserId: conn.threadsUserId },
        select: { id: true },
      });

      if (postInsights.length > 0) {
        const deleted = await prisma.postInsightSnapshot.deleteMany({
          where: {
            postInsightId: { in: postInsights.map((p) => p.id) },
            capturedAt: { lt: cutoffDate },
          },
        });
        if (deleted.count > 0) {
          console.log(`[data-cleanup] Deleted ${deleted.count} PostInsightSnapshots for user ${user.id}`);
        }
      }

      // Delete old AccountInsightsSnapshots
      const deletedAccSnaps = await prisma.accountInsightsSnapshot.deleteMany({
        where: {
          threadsUserId: conn.threadsUserId,
          date: { lt: cutoffDate },
        },
      });
      if (deletedAccSnaps.count > 0) {
        console.log(`[data-cleanup] Deleted ${deletedAccSnaps.count} AccountInsightsSnapshots for user ${user.id}`);
      }
    }

    // Delete old KeywordTrendData
    const trackedKeywords = await prisma.trackedKeyword.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    if (trackedKeywords.length > 0) {
      const deletedKwData = await prisma.keywordTrendData.deleteMany({
        where: {
          trackedKeywordId: { in: trackedKeywords.map((kw) => kw.id) },
          date: { lt: cutoffDate },
        },
      });
      if (deletedKwData.count > 0) {
        console.log(`[data-cleanup] Deleted ${deletedKwData.count} KeywordTrendData for user ${user.id}`);
      }
    }
  }

  // 2. Shared entity cleanup: CreatorSnapshot and PublicPostSnapshot
  // Group creators by the max retention across all users who track them
  const trackedCreators = await prisma.trackedCreator.findMany({
    include: { user: { select: { plan: true } } },
  });
  const allCompetitors = await prisma.competitor.findMany({
    include: { user: { select: { plan: true } } },
  });

  const creatorRetention = new Map<string, number>();

  for (const tc of trackedCreators) {
    const limits = PLAN_LIMITS[tc.user.plan as PlanTier];
    if (!limits) continue;
    const current = creatorRetention.get(tc.creatorId) ?? 0;
    creatorRetention.set(tc.creatorId, Math.max(current, limits.historyDays));
  }
  for (const comp of allCompetitors) {
    const limits = PLAN_LIMITS[comp.user.plan as PlanTier];
    if (!limits) continue;
    const current = creatorRetention.get(comp.creatorId) ?? 0;
    creatorRetention.set(comp.creatorId, Math.max(current, limits.historyDays));
  }

  // Batch delete CreatorSnapshots per retention group
  const creatorRetentionGroups = new Map<number, string[]>();
  for (const [creatorId, days] of creatorRetention) {
    const group = creatorRetentionGroups.get(days) ?? [];
    group.push(creatorId);
    creatorRetentionGroups.set(days, group);
  }

  for (const [days, creatorIds] of creatorRetentionGroups) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const deleted = await prisma.creatorSnapshot.deleteMany({
      where: {
        creatorId: { in: creatorIds },
        capturedAt: { lt: cutoff },
      },
    });
    if (deleted.count > 0) {
      console.log(`[data-cleanup] Deleted ${deleted.count} CreatorSnapshots (retention: ${days}d)`);
    }
  }

  // PublicPostSnapshot: tracked posts + posts belonging to tracked creators
  const trackedPosts = await prisma.trackedPost.findMany({
    include: { user: { select: { plan: true } } },
  });

  const postRetention = new Map<string, number>();

  for (const tp of trackedPosts) {
    const limits = PLAN_LIMITS[tp.user.plan as PlanTier];
    if (!limits) continue;
    const current = postRetention.get(tp.publicPostId) ?? 0;
    postRetention.set(tp.publicPostId, Math.max(current, limits.historyDays));
  }

  // Posts whose creator is tracked inherit that creator's retention
  const trackedCreatorIds = new Set([
    ...trackedCreators.map((tc) => tc.creatorId),
    ...allCompetitors.map((c) => c.creatorId),
  ]);

  if (trackedCreatorIds.size > 0) {
    const publicPostsWithCreator = await prisma.publicPost.findMany({
      where: {
        creatorId: { in: [...trackedCreatorIds] },
        snapshots: { some: {} },
      },
      select: { id: true, creatorId: true },
    });

    for (const pp of publicPostsWithCreator) {
      if (pp.creatorId && creatorRetention.has(pp.creatorId)) {
        const creatorDays = creatorRetention.get(pp.creatorId)!;
        const current = postRetention.get(pp.id) ?? 0;
        postRetention.set(pp.id, Math.max(current, creatorDays));
      }
    }
  }

  // Batch delete PublicPostSnapshots per retention group
  const postRetentionGroups = new Map<number, string[]>();
  for (const [postId, days] of postRetention) {
    const group = postRetentionGroups.get(days) ?? [];
    group.push(postId);
    postRetentionGroups.set(days, group);
  }

  for (const [days, postIds] of postRetentionGroups) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const deleted = await prisma.publicPostSnapshot.deleteMany({
      where: {
        publicPostId: { in: postIds },
        capturedAt: { lt: cutoff },
      },
    });
    if (deleted.count > 0) {
      console.log(`[data-cleanup] Deleted ${deleted.count} PublicPostSnapshots (retention: ${days}d)`);
    }
  }

  // 3. Orphaned snapshots (creators/posts no longer tracked by anyone) - 7-day retention
  const orphanCutoff = new Date();
  orphanCutoff.setDate(orphanCutoff.getDate() - 7);

  if (trackedCreatorIds.size > 0) {
    const deletedOrphaned = await prisma.creatorSnapshot.deleteMany({
      where: {
        creatorId: { notIn: [...trackedCreatorIds] },
        capturedAt: { lt: orphanCutoff },
      },
    });
    if (deletedOrphaned.count > 0) {
      console.log(`[data-cleanup] Deleted ${deletedOrphaned.count} orphaned CreatorSnapshots`);
    }
  } else {
    const deletedOrphaned = await prisma.creatorSnapshot.deleteMany({
      where: { capturedAt: { lt: orphanCutoff } },
    });
    if (deletedOrphaned.count > 0) {
      console.log(`[data-cleanup] Deleted ${deletedOrphaned.count} orphaned CreatorSnapshots`);
    }
  }

  const allTrackedPostIds = new Set(trackedPosts.map((tp) => tp.publicPostId));
  // Also include posts from tracked creators
  if (trackedCreatorIds.size > 0) {
    const creatorPosts = await prisma.publicPost.findMany({
      where: { creatorId: { in: [...trackedCreatorIds] } },
      select: { id: true },
    });
    for (const cp of creatorPosts) {
      allTrackedPostIds.add(cp.id);
    }
  }

  if (allTrackedPostIds.size > 0) {
    const deletedOrphanedPosts = await prisma.publicPostSnapshot.deleteMany({
      where: {
        publicPostId: { notIn: [...allTrackedPostIds] },
        capturedAt: { lt: orphanCutoff },
      },
    });
    if (deletedOrphanedPosts.count > 0) {
      console.log(`[data-cleanup] Deleted ${deletedOrphanedPosts.count} orphaned PublicPostSnapshots`);
    }
  } else {
    const deletedOrphanedPosts = await prisma.publicPostSnapshot.deleteMany({
      where: { capturedAt: { lt: orphanCutoff } },
    });
    if (deletedOrphanedPosts.count > 0) {
      console.log(`[data-cleanup] Deleted ${deletedOrphanedPosts.count} orphaned PublicPostSnapshots`);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`[data-cleanup] Cleanup completed in ${elapsed}ms`);
}

// ==================== Worker Registration ====================

const workers: Worker[] = [];

function createWorker(queueName: string, processor: (job: Job) => Promise<void>): Worker {
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
  });

  worker.on('completed', (job) => {
    console.log(`[${queueName}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[${queueName}] Job ${job?.id} failed:`, error.message);
  });

  workers.push(worker);
  return worker;
}

createWorker('sync-own-analytics', processSyncAnalytics);
createWorker('account-snapshot', processAccountSnapshot);
createWorker('keyword-trend-collection', processKeywordTrend);
createWorker('competitor-snapshot', processCompetitorSnapshot);
createWorker('engagement-snapshot', processEngagementSnapshot);
createWorker('scheduled-post-publisher', processScheduledPost);
createWorker('alert-evaluation', processAlertEvaluation);
createWorker('token-refresh', processTokenRefresh);
createWorker('report-generation', processReportGeneration);
createWorker('data-cleanup', processDataCleanup);

console.log(`ThreadScope worker started with concurrency ${concurrency}`);
console.log(`Registered ${workers.length} queue workers`);

// ==================== Graceful Shutdown ====================

async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
