// -------------------------------------------------------
// Competitor benchmarking types
// -------------------------------------------------------

/** Competitor profile with engagement stats */
export interface CompetitorData {
  id: string;
  creatorId: string;
  username: string;
  profilePictureUrl: string;
  label: string;
  avgLikes: number;
  avgReplies: number;
  avgReposts: number;
  avgEngagement: number;
  postFrequency: number;
  topTopics: string[];
  lastPostAt: string;
}

/** Shared metrics shape for benchmark comparison */
export interface BenchmarkMetrics {
  avgLikes: number;
  avgReplies: number;
  avgReposts: number;
  avgEngagement: number;
  postFrequency: number;
}

/** Benchmark comparison between you and your competitors */
export interface BenchmarkComparison {
  you: BenchmarkMetrics;
  competitors: Array<{
    competitorId: string;
    metrics: BenchmarkMetrics;
  }>;
}
