import { prisma } from './lib/db';
import {
  syncAnalyticsQueue,
  accountSnapshotQueue,
  keywordTrendQueue,
  tokenRefreshQueue,
  competitorSnapshotQueue,
  engagementSnapshotQueue,
  alertEvaluationQueue,
  dataCleanupQueue,
} from './lib/queue';
import { TOKEN_REFRESH_BUFFER_DAYS } from './lib/constants';

/**
 * Register repeatable BullMQ jobs for background processing.
 * Called once at API server startup.
 */
export async function startScheduler(): Promise<void> {
  // ── Token Refresh: every 12 hours ──
  await tokenRefreshQueue.upsertJobScheduler(
    'token-refresh-scheduler',
    { every: 12 * 60 * 60 * 1000 },
    {
      name: 'check-expiring-tokens',
      data: {},
    },
  );

  // ── Analytics Sync: every 6 hours ──
  await syncAnalyticsQueue.upsertJobScheduler(
    'sync-analytics-scheduler',
    { every: 6 * 60 * 60 * 1000 },
    {
      name: 'sync-all-users',
      data: {},
    },
  );

  // ── Account Snapshot: daily at midnight UTC ──
  await accountSnapshotQueue.upsertJobScheduler(
    'account-snapshot-scheduler',
    { pattern: '0 0 * * *' },
    {
      name: 'snapshot-all-users',
      data: {},
    },
  );

  // ── Keyword Trends: daily at 2 AM UTC ──
  await keywordTrendQueue.upsertJobScheduler(
    'keyword-trend-scheduler',
    { pattern: '0 2 * * *' },
    {
      name: 'collect-all-keywords',
      data: {},
    },
  );

  // ── Competitor Snapshot: every 6 hours ──
  await competitorSnapshotQueue.upsertJobScheduler(
    'competitor-snapshot-scheduler',
    { every: 6 * 60 * 60 * 1000 },
    {
      name: 'snapshot-all-competitors',
      data: {},
    },
  );

  // ── Engagement Snapshot: every 4 hours ──
  await engagementSnapshotQueue.upsertJobScheduler(
    'engagement-snapshot-scheduler',
    { every: 4 * 60 * 60 * 1000 },
    {
      name: 'snapshot-all-engagement',
      data: {},
    },
  );

  // ── Alert Evaluation: every 2 hours ──
  await alertEvaluationQueue.upsertJobScheduler(
    'alert-evaluation-scheduler',
    { every: 2 * 60 * 60 * 1000 },
    {
      name: 'evaluate-all-alerts',
      data: {},
    },
  );

  // ── Data Cleanup: daily at 3 AM UTC ──
  await dataCleanupQueue.upsertJobScheduler(
    'data-cleanup-scheduler',
    { pattern: '0 3 * * *' },
    {
      name: 'cleanup-old-data',
      data: {},
    },
  );

  console.log('Scheduler registered repeatable jobs');
}

/** Date string for deduplication keys (YYYY-MM-DD-HH) */
function deduplicationWindow(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`;
}

/**
 * Fan-out: enqueue individual token refresh jobs for expiring connections.
 * Uses jobId for deduplication to prevent duplicate refreshes.
 */
export async function fanOutTokenRefresh(): Promise<void> {
  const bufferDate = new Date();
  bufferDate.setDate(bufferDate.getDate() + TOKEN_REFRESH_BUFFER_DAYS);

  const expiringConnections = await prisma.threadsConnection.findMany({
    where: {
      tokenExpiresAt: { lte: bufferDate },
    },
    select: { id: true },
    take: 10000,
  });

  const window = deduplicationWindow();
  for (const conn of expiringConnections) {
    await tokenRefreshQueue.add(
      'token-refresh',
      { connectionId: conn.id },
      { jobId: `token-refresh-${conn.id}-${window}` },
    );
  }

  if (expiringConnections.length > 0) {
    console.log(`[scheduler] Enqueued ${expiringConnections.length} token refresh jobs`);
  }
}

/**
 * Fan-out: enqueue analytics sync for every connected user.
 */
export async function fanOutSyncAnalytics(): Promise<void> {
  const connections = await prisma.threadsConnection.findMany({
    select: { userId: true },
    take: 10000,
  });

  const window = deduplicationWindow();
  for (const conn of connections) {
    await syncAnalyticsQueue.add(
      'sync-own-analytics',
      { userId: conn.userId },
      { jobId: `sync-analytics-${conn.userId}-${window}` },
    );
  }

  if (connections.length > 0) {
    console.log(`[scheduler] Enqueued ${connections.length} analytics sync jobs`);
  }
}

/**
 * Fan-out: enqueue account snapshot for every connected user.
 */
export async function fanOutAccountSnapshot(): Promise<void> {
  const connections = await prisma.threadsConnection.findMany({
    select: { userId: true },
    take: 10000,
  });

  const window = deduplicationWindow();
  for (const conn of connections) {
    await accountSnapshotQueue.add(
      'account-snapshot',
      { userId: conn.userId },
      { jobId: `account-snapshot-${conn.userId}-${window}` },
    );
  }

  if (connections.length > 0) {
    console.log(`[scheduler] Enqueued ${connections.length} account snapshot jobs`);
  }
}

/**
 * Fan-out: enqueue keyword trend collection for every active keyword.
 */
export async function fanOutKeywordTrends(): Promise<void> {
  const keywords = await prisma.trackedKeyword.findMany({
    where: { isActive: true },
    select: { id: true, keyword: true, userId: true },
    take: 10000,
  });

  const window = deduplicationWindow();
  for (const kw of keywords) {
    await keywordTrendQueue.add(
      'keyword-trend-collection',
      {
        trackedKeywordId: kw.id,
        keyword: kw.keyword,
        userId: kw.userId,
      },
      { jobId: `keyword-trend-${kw.id}-${window}` },
    );
  }

  if (keywords.length > 0) {
    console.log(`[scheduler] Enqueued ${keywords.length} keyword trend jobs`);
  }
}

/**
 * Fan-out: enqueue competitor snapshot for every tracked competitor.
 */
export async function fanOutCompetitorSnapshots(): Promise<void> {
  const competitors = await prisma.competitor.findMany({
    include: { creator: true },
    take: 10000,
  });

  const window = deduplicationWindow();
  for (const comp of competitors) {
    await competitorSnapshotQueue.add(
      'competitor-snapshot',
      {
        competitorId: comp.id,
        creatorId: comp.creatorId,
        userId: comp.userId,
      },
      { jobId: `competitor-snapshot-${comp.id}-${window}` },
    );
  }

  if (competitors.length > 0) {
    console.log(`[scheduler] Enqueued ${competitors.length} competitor snapshot jobs`);
  }
}

/**
 * Fan-out: enqueue engagement snapshot for tracked public posts.
 */
export async function fanOutEngagementSnapshots(): Promise<void> {
  const posts = await prisma.publicPost.findMany({
    where: {
      OR: [
        { trackedBy: { some: {} } },
        { creator: { trackedBy: { some: {} } } },
      ],
    },
    select: { id: true },
    take: 10000,
  });

  const window = deduplicationWindow();
  for (const post of posts) {
    await engagementSnapshotQueue.add(
      'engagement-snapshot',
      { publicPostId: post.id },
      { jobId: `engagement-snapshot-${post.id}-${window}` },
    );
  }

  if (posts.length > 0) {
    console.log(`[scheduler] Enqueued ${posts.length} engagement snapshot jobs`);
  }
}

/**
 * Fan-out: enqueue alert evaluation for every active alert.
 */
export async function fanOutAlertEvaluation(): Promise<void> {
  const alerts = await prisma.alert.findMany({
    where: { isActive: true },
    select: { id: true },
    take: 10000,
  });

  const window = deduplicationWindow();
  for (const alert of alerts) {
    await alertEvaluationQueue.add(
      'alert-evaluation',
      { alertId: alert.id },
      { jobId: `alert-evaluation-${alert.id}-${window}` },
    );
  }

  if (alerts.length > 0) {
    console.log(`[scheduler] Enqueued ${alerts.length} alert evaluation jobs`);
  }
}
