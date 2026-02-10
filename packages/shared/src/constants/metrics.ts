// -------------------------------------------------------
// Metric definitions & plan limits
// -------------------------------------------------------

export interface MetricDefinition {
  label: string;
  description: string;
  icon: string;
}

/**
 * Human-readable definitions for every core metric surfaced in the UI.
 */
export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  views: {
    label: 'Views',
    description: 'Total number of times the post was seen',
    icon: 'eye',
  },
  likes: {
    label: 'Likes',
    description: 'Number of likes received',
    icon: 'heart',
  },
  replies: {
    label: 'Replies',
    description: 'Number of replies received',
    icon: 'message-circle',
  },
  reposts: {
    label: 'Reposts',
    description: 'Number of times the post was reposted',
    icon: 'repeat',
  },
  quotes: {
    label: 'Quotes',
    description: 'Number of times the post was quoted',
    icon: 'quote',
  },
  shares: {
    label: 'Shares',
    description: 'Number of times the post was shared externally',
    icon: 'share',
  },
  clicks: {
    label: 'Clicks',
    description: 'Number of link clicks on the post',
    icon: 'mouse-pointer',
  },
  engagementRate: {
    label: 'Engagement Rate',
    description: 'Percentage of viewers who interacted with the post',
    icon: 'activity',
  },
  followersCount: {
    label: 'Followers',
    description: 'Total number of followers',
    icon: 'users',
  },
  followerGrowth: {
    label: 'Follower Growth',
    description: 'Net change in followers over the selected period',
    icon: 'trending-up',
  },
  postCount: {
    label: 'Posts',
    description: 'Number of posts published in the selected period',
    icon: 'file-text',
  },
} as const;

// -------------------------------------------------------
// Plan tiers and limits
// -------------------------------------------------------

export type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface PlanLimits {
  /** Maximum number of Threads accounts that can be connected */
  maxAccounts: number;
  /** Maximum tracked keywords */
  maxTrackedKeywords: number;
  /** Maximum competitor profiles to benchmark */
  maxCompetitors: number;
  /** Days of historical data available */
  historyDays: number;
  /** Maximum scheduled posts at a time */
  maxScheduledPosts: number;
  /** Whether AI-generated insights are available */
  aiInsights: boolean;
  /** Whether custom reports can be generated */
  customReports: boolean;
  /** Maximum alerts configurable */
  maxAlerts: number;
  /** Whether the user can export data */
  exportEnabled: boolean;
  /** API request quota per day */
  apiRequestsPerDay: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    maxAccounts: 1,
    maxTrackedKeywords: 3,
    maxCompetitors: 2,
    historyDays: 7,
    maxScheduledPosts: 5,
    aiInsights: false,
    customReports: false,
    maxAlerts: 2,
    exportEnabled: false,
    apiRequestsPerDay: 100,
  },
  STARTER: {
    maxAccounts: 2,
    maxTrackedKeywords: 10,
    maxCompetitors: 5,
    historyDays: 30,
    maxScheduledPosts: 25,
    aiInsights: false,
    customReports: false,
    maxAlerts: 5,
    exportEnabled: true,
    apiRequestsPerDay: 500,
  },
  PRO: {
    maxAccounts: 5,
    maxTrackedKeywords: 50,
    maxCompetitors: 20,
    historyDays: 90,
    maxScheduledPosts: 100,
    aiInsights: true,
    customReports: true,
    maxAlerts: 25,
    exportEnabled: true,
    apiRequestsPerDay: 2000,
  },
  ENTERPRISE: {
    maxAccounts: 25,
    maxTrackedKeywords: 200,
    maxCompetitors: 100,
    historyDays: 365,
    maxScheduledPosts: 500,
    aiInsights: true,
    customReports: true,
    maxAlerts: 100,
    exportEnabled: true,
    apiRequestsPerDay: 10000,
  },
} as const;
