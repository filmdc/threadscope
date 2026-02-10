import { Worker, Job } from 'bullmq';
import { createRedisConnection } from './lib/redis';

const connection = createRedisConnection();
const concurrency = parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10);

// ==================== Job Processors ====================

async function processSyncAnalytics(job: Job): Promise<void> {
  console.log(`[sync-own-analytics] Processing for user: ${job.data.userId}`);
  // TODO: Implement in Phase 2
  // 1. Get user's ThreadsConnection
  // 2. Fetch their recent posts via getMyThreads()
  // 3. Fetch insights for each post via getMediaInsights()
  // 4. Upsert PostInsight records
  // 5. Create PostInsightSnapshot entries
}

async function processAccountSnapshot(job: Job): Promise<void> {
  console.log(`[account-snapshot] Processing for user: ${job.data.threadsUserId}`);
  // TODO: Implement in Phase 2
  // 1. Fetch user insights (views, likes, replies, reposts, quotes, followers_count)
  // 2. Fetch follower_demographics if 100+ followers
  // 3. Upsert AccountInsightsSnapshot
}

async function processKeywordTrend(job: Job): Promise<void> {
  console.log(`[keyword-trend] Processing keyword: ${job.data.keyword}`);
  // TODO: Implement in Phase 2
  // 1. Run keyword search for today's window
  // 2. Aggregate: post count, total engagement, avg engagement
  // 3. Find top post and top creator
  // 4. Upsert KeywordTrendData
}

async function processCompetitorSnapshot(job: Job): Promise<void> {
  console.log(`[competitor-snapshot] Processing competitor: ${job.data.creatorId}`);
  // TODO: Implement in Phase 3
}

async function processEngagementSnapshot(job: Job): Promise<void> {
  console.log(`[engagement-snapshot] Processing post: ${job.data.publicPostId}`);
  // TODO: Implement in Phase 2
}

async function processScheduledPost(job: Job): Promise<void> {
  console.log(`[scheduled-post] Publishing: ${job.data.scheduledPostId}`);
  // TODO: Implement in Phase 3
}

async function processAlertEvaluation(job: Job): Promise<void> {
  console.log(`[alert-evaluation] Evaluating alerts for trigger: ${job.data.trigger}`);
  // TODO: Implement in Phase 3
}

async function processTokenRefresh(job: Job): Promise<void> {
  console.log(`[token-refresh] Refreshing token for: ${job.data.connectionId}`);
  // TODO: Implement in Phase 2
}

async function processReportGeneration(job: Job): Promise<void> {
  console.log(`[report-generation] Generating report: ${job.data.reportId}`);
  // TODO: Implement in Phase 4
}

async function processDataCleanup(job: Job): Promise<void> {
  console.log(`[data-cleanup] Running cleanup`);
  // TODO: Implement in Phase 4
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
