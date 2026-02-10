import { Queue, type QueueOptions } from 'bullmq';
import { createRedisConnection } from './redis';

const connection = createRedisConnection();

const defaultJobOptions: QueueOptions['defaultJobOptions'] = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

function createQueue(name: string): Queue {
  return new Queue(name, { connection, defaultJobOptions });
}

export const syncAnalyticsQueue = createQueue('sync-own-analytics');
export const accountSnapshotQueue = createQueue('account-snapshot');
export const keywordTrendQueue = createQueue('keyword-trend-collection');
export const competitorSnapshotQueue = createQueue('competitor-snapshot');
export const engagementSnapshotQueue = createQueue('engagement-snapshot');
export const scheduledPostQueue = createQueue('scheduled-post-publisher');
export const alertEvaluationQueue = createQueue('alert-evaluation');
export const tokenRefreshQueue = createQueue('token-refresh');
export const reportGenerationQueue = createQueue('report-generation');
export const dataCleanupQueue = createQueue('data-cleanup');

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
