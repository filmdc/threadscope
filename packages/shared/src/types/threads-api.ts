// -------------------------------------------------------
// Threads API types
// -------------------------------------------------------

/** Media type of a Threads post */
export enum MediaType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CAROUSEL = 'CAROUSEL',
}

/** Reply audience options */
export type ReplyAudience = 'everyone' | 'accounts_you_follow' | 'mentioned_only';

/** Hide status for a reply */
export type HideStatus = 'not_hushed' | 'unhushed' | 'hidden' | 'covered';

// -------------------------------------------------------
// Profile
// -------------------------------------------------------

export interface ThreadsProfile {
  id: string;
  username: string;
  threads_profile_picture_url: string;
  threads_biography: string;
  is_verified: boolean;
}

// -------------------------------------------------------
// Media
// -------------------------------------------------------

export interface ThreadsMediaOwner {
  id: string;
}

export interface ThreadsMediaChild {
  id: string;
  media_type: MediaType;
  media_url?: string;
  thumbnail_url?: string;
}

export interface ThreadsMedia {
  id: string;
  media_product_type: string;
  media_type: MediaType;
  media_url?: string;
  permalink: string;
  owner: ThreadsMediaOwner;
  username: string;
  text: string;
  timestamp: string;
  shortcode: string;
  thumbnail_url?: string;
  children?: ThreadsMediaChild[];
  is_quote_post: boolean;
  has_replies: boolean;
  root_post?: { id: string };
  replied_to?: { id: string };
  is_reply: boolean;
  hide_status: HideStatus;
  reply_audience?: ReplyAudience;
  topic_tag?: string;
  link_attachment_url?: string;
}

// -------------------------------------------------------
// Insights
// -------------------------------------------------------

export interface MediaInsightValue {
  value: number;
}

export interface MediaInsights {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
  clicks: number;
}

export interface UserInsightsValue {
  value: number;
  end_time?: string;
}

export interface UserInsightsDemographicBreakdown {
  dimension_key: string;
  results: Array<{
    dimension_values: string[];
    value: number;
  }>;
}

export interface UserInsights {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  followers_count: number;
  follower_demographics?: UserInsightsDemographicBreakdown;
}

// -------------------------------------------------------
// Pagination
// -------------------------------------------------------

export interface PaginationCursors {
  before: string;
  after: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  paging: {
    cursors: PaginationCursors;
  };
}

// -------------------------------------------------------
// OAuth / Token
// -------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// -------------------------------------------------------
// Publishing
// -------------------------------------------------------

export interface CreateContainerParams {
  user_id: string;
  media_type: MediaType;
  text?: string;
  image_url?: string;
  video_url?: string;
  reply_to_id?: string;
  reply_control?: ReplyAudience;
  poll?: {
    options: string[];
    duration?: number;
  };
  topic_tag?: string;
  link_attachment_url?: string;
  location_id?: string;
}

export type ContainerStatusValue = 'IN_PROGRESS' | 'FINISHED' | 'ERROR';

export interface ContainerStatus {
  id: string;
  status: ContainerStatusValue;
  error_message?: string;
}
