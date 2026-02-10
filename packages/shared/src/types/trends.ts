// -------------------------------------------------------
// Trend-tracking types
// -------------------------------------------------------

/** A tracked keyword's current state and latest aggregate data */
export interface TrackedKeywordData {
  id: string;
  keyword: string;
  isActive: boolean;
  latestData: {
    postCount: number;
    avgEngagement: number;
    trend: 'rising' | 'falling' | 'stable';
  };
}

/** A single data point on a keyword's time-series trend */
export interface KeywordTrendPoint {
  date: string;
  postCount: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  avgEngagement: number;
  sampleSize: number;
}

/** Side-by-side comparison of multiple keyword trends */
export interface TrendComparison {
  keywords: Array<{
    keyword: string;
    data: KeywordTrendPoint[];
  }>;
}

/** A top-performing post for a given keyword */
export interface TopPostForKeyword {
  threadsMediaId: string;
  text: string;
  username: string;
  likes: number;
  replies: number;
  reposts: number;
  publishedAt: string;
  permalink: string;
}

/** A top creator associated with a keyword */
export interface TopCreatorForKeyword {
  username: string;
  postCount: number;
  totalEngagement: number;
  avgEngagement: number;
  profilePictureUrl: string;
  isVerified: boolean;
}
