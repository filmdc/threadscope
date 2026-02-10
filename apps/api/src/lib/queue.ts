import { Queue } from 'bullmq';
import { createRedisConnection } from './redis';

const connection = createRedisConnection();

export const syncAnalyticsQueue = new Queue('sync-own-analytics', { connection });
export const accountSnapshotQueue = new Queue('account-snapshot', { connection });
export const keywordTrendQueue = new Queue('keyword-trend-collection', { connection });
export const competitorSnapshotQueue = new Queue('competitor-snapshot', { connection });
export const engagementSnapshotQueue = new Queue('engagement-snapshot', { connection });
export const scheduledPostQueue = new Queue('scheduled-post-publisher', { connection });
export const alertEvaluationQueue = new Queue('alert-evaluation', { connection });
export const tokenRefreshQueue = new Queue('token-refresh', { connection });
export const reportGenerationQueue = new Queue('report-generation', { connection });
export const dataCleanupQueue = new Queue('data-cleanup', { connection });

export const allQueues = {
  syncAnalytics: syncAnalyticsQueue,
  accountSnapshot: accountSnapshotQueue,
  keywordTrend: keywordTrendQueue,
  competitorSnapshot: competitorSnapshotQueue,
  engagementSnapshot: engagementSnapshotQueue,
  scheduledPost: scheduledPostQueue,
  alertEvaluation: alertEvaluationQueue,
  tokenRefresh: tokenRefreshQueue,
  reportGeneration: reportGenerationQueue,
  dataCleanup: dataCleanupQueue,
};
