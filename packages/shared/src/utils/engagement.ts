// -------------------------------------------------------
// Engagement calculation utilities
// -------------------------------------------------------

/**
 * Calculate the engagement rate for a post.
 * Engagement rate = (likes + replies + reposts + quotes) / views
 * Returns a value between 0 and 1, or 0 when views is 0.
 */
export function calculateEngagementRate(
  likes: number,
  replies: number,
  reposts: number,
  quotes: number,
  views: number,
): number {
  if (views <= 0) return 0;
  return (likes + replies + reposts + quotes) / views;
}

// -------------------------------------------------------
// Post score
// -------------------------------------------------------

export interface PostMetricsInput {
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  views: number;
  shares?: number;
  clicks?: number;
}

/** Weight configuration for scoring */
const WEIGHTS = {
  likes: 1,
  replies: 3,
  reposts: 5,
  quotes: 5,
  shares: 2,
  clicks: 1,
  viewMultiplier: 0.001,
} as const;

/**
 * Calculate a weighted composite score for a post.
 *
 * The score is designed to rank posts relative to each other rather than
 * represent an absolute measure. Higher is better.
 *
 * Score = (likes * 1) + (replies * 3) + (reposts * 5) + (quotes * 5)
 *       + (shares * 2) + (clicks * 1) + (views * 0.001)
 */
export function calculatePostScore(metrics: PostMetricsInput): number {
  const {
    likes,
    replies,
    reposts,
    quotes,
    views,
    shares = 0,
    clicks = 0,
  } = metrics;

  return (
    likes * WEIGHTS.likes +
    replies * WEIGHTS.replies +
    reposts * WEIGHTS.reposts +
    quotes * WEIGHTS.quotes +
    shares * WEIGHTS.shares +
    clicks * WEIGHTS.clicks +
    views * WEIGHTS.viewMultiplier
  );
}

// -------------------------------------------------------
// Trend classification
// -------------------------------------------------------

export type TrendDirection = 'rising' | 'falling' | 'stable';

/**
 * Classify a numeric time-series as rising, falling, or stable using
 * simple linear regression. If the slope's magnitude relative to the
 * mean is within a +-5 % band the trend is classified as stable.
 *
 * @param dataPoints Ordered array of numeric values (oldest first).
 * @returns The trend direction.
 */
export function classifyTrend(dataPoints: number[]): TrendDirection {
  if (dataPoints.length < 2) return 'stable';

  const n = dataPoints.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = dataPoints[i]!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const mean = sumY / n;

  // Avoid division by zero when the mean is 0
  if (mean === 0) {
    if (slope > 0) return 'rising';
    if (slope < 0) return 'falling';
    return 'stable';
  }

  const relativeSlope = slope / Math.abs(mean);

  if (relativeSlope > 0.05) return 'rising';
  if (relativeSlope < -0.05) return 'falling';
  return 'stable';
}
