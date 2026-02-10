// ==================== Response Types ====================

export interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
  };
  threadsConnection: {
    username: string;
    profilePictureUrl: string | null;
    isVerified: boolean;
    threadsUserId: string;
  } | null;
}

export interface PostResponse {
  post: {
    threadsMediaId: string;
    text: string | null;
    mediaType: string;
    permalink: string | null;
    likes: number;
    replies: number;
    reposts: number;
    views?: number;
    engagementRate?: number;
    publishedAt: string;
  } | null;
}

export interface BatchPostsResponse {
  posts: Array<{
    threadsMediaId: string;
    text: string | null;
    likes: number;
    replies: number;
    reposts: number;
  }>;
}

export interface CreatorResponse {
  creator: {
    username: string;
    profilePictureUrl: string | null;
    biography: string | null;
    isVerified: boolean;
    observedPostCount: number;
    avgLikes: number | null;
    avgReplies: number | null;
    avgReposts: number | null;
    avgEngagement: number | null;
    primaryTopics: string[];
    postFrequency: string | null;
  } | null;
}

export interface KeywordTrendResponse {
  keyword: string;
  trend: 'rising' | 'falling' | 'stable';
  latestPostCount: number;
  latestAvgEngagement: number;
}

export interface NotificationsResponse {
  alerts: Array<{
    id: string;
    type: string;
    isActive: boolean;
    lastTriggered: string | null;
    triggerCount: number;
  }>;
}

export interface ScheduledResponse {
  posts: Array<{
    id: string;
    text: string;
    scheduledFor: string;
    status: string;
  }>;
}

export interface TrackResponse {
  success: boolean;
}

// ==================== API Client ====================

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(
      { type: 'API_REQUEST', endpoint, options },
      (response) => {
        if (response?.error) reject(new Error(response.error));
        else resolve(response as T);
      }
    );
  });
}

export const api = {
  getMe: () => apiRequest<MeResponse>('/me'),
  getPost: (mediaId: string) => apiRequest<PostResponse>(`/post/${mediaId}`),
  batchPosts: (mediaIds: string[]) =>
    apiRequest<BatchPostsResponse>('/post/batch', {
      method: 'POST',
      body: JSON.stringify({ mediaIds }),
    }),
  getCreator: (username: string) => apiRequest<CreatorResponse>(`/creator/${username}`),
  getKeywordTrend: (keyword: string) => apiRequest<KeywordTrendResponse>(`/keyword/${keyword}/trend`),
  getNotifications: () => apiRequest<NotificationsResponse>('/notifications'),
  getScheduled: () => apiRequest<ScheduledResponse>('/scheduled'),
  trackCreator: (creatorId: string) =>
    apiRequest<TrackResponse>('/track/creator', {
      method: 'POST',
      body: JSON.stringify({ creatorId }),
    }),
  trackPost: (publicPostId: string) =>
    apiRequest<TrackResponse>('/track/post', {
      method: 'POST',
      body: JSON.stringify({ publicPostId }),
    }),
};
