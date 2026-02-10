// -------------------------------------------------------
// Analytics types
// -------------------------------------------------------

import type { MediaType } from './threads-api.js';

/** High-level overview metrics for an account */
export interface OverviewMetrics {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
  followersCount: number;
  followerGrowth: number;
  engagementRate: number;
  postCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

/** Performance data for an individual post */
export interface PostPerformanceItem {
  id: string;
  text: string;
  mediaType: MediaType;
  permalink: string;
  topicTag?: string;
  publishedAt: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
  clicks: number;
  engagementRate: number;
}

/** Demographic breakdown of the audience */
export interface AudienceInsights {
  followersByCountry: Record<string, number>;
  followersByCity: Record<string, number>;
  followersByAge: Record<string, number>;
  followersByGender: Record<string, number>;
  totalFollowers: number;
}

/** Best-time-to-post data point */
export interface BestTimeData {
  dayOfWeek: number;
  hourOfDay: number;
  avgEngagement: number;
  postCount: number;
}

/** Engagement breakdown per media format */
export interface FormatBreakdown {
  mediaType: MediaType;
  postCount: number;
  avgEngagement: number;
  avgViews: number;
  avgLikes: number;
}
