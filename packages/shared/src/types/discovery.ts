// -------------------------------------------------------
// Creator discovery types
// -------------------------------------------------------

/** A discovered creator profile with engagement stats */
export interface DiscoveredCreator {
  id: string;
  threadsUserId: string;
  username: string;
  profilePictureUrl: string;
  biography: string;
  isVerified: boolean;
  observedPostCount: number;
  avgLikes: number;
  avgReplies: number;
  avgReposts: number;
  avgEngagement: number;
  primaryTopics: string[];
  postFrequency: number;
  lastPostAt: string;
}

/** Sort options for creator search */
export type CreatorSortBy =
  | 'avgEngagement'
  | 'avgLikes'
  | 'observedPostCount'
  | 'postFrequency';

/** Filters when searching for creators */
export interface CreatorSearchFilters {
  keyword: string;
  minEngagementRate?: number;
  minPostCount?: number;
  verifiedOnly?: boolean;
  sortBy: CreatorSortBy;
}
