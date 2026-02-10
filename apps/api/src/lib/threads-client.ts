import { THREADS_API_BASE_URL } from './constants';

// ==================== Types ====================

export interface ThreadsProfile {
  id: string;
  username: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
  is_verified?: boolean;
}

export interface ThreadsMedia {
  id: string;
  media_product_type?: string;
  media_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  media_url?: string;
  permalink?: string;
  owner?: { id: string };
  username?: string;
  text?: string;
  timestamp?: string;
  shortcode?: string;
  thumbnail_url?: string;
  children?: { data: Array<{ id: string }> };
  is_quote_post?: boolean;
  has_replies?: boolean;
  root_post?: { id: string };
  replied_to?: { id: string };
  is_reply?: boolean;
  hide_status?: string;
  reply_audience?: string;
  topic_tag?: string;
  link_attachment_url?: string;
  // Public engagement counts (visible on search results)
  likes?: number;
  replies?: number;
  reposts?: number;
}

export interface MediaInsightValue {
  name: string;
  period: string;
  values: Array<{ value: number }>;
  title: string;
  description: string;
  id: string;
}

export interface MediaInsights {
  data: MediaInsightValue[];
}

export interface UserInsightValue {
  name: string;
  period: string;
  values: Array<{ value: number | Record<string, number>; end_time?: string }>;
  title: string;
  description: string;
  id: string;
}

export interface UserInsights {
  data: UserInsightValue[];
}

export interface PaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CreateContainerParams {
  user_id: string;
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  text?: string;
  image_url?: string;
  video_url?: string;
  reply_to_id?: string;
  reply_control?: 'everyone' | 'accounts_you_follow' | 'mentioned_only' | 'parent_post_author_only' | 'followers_only';
  poll?: { options: string[]; duration: number };
  topic_tag?: string;
  link_attachment_url?: string;
  location_id?: string;
  children?: string[]; // For carousel items
}

export interface ContainerStatus {
  id: string;
  status: 'IN_PROGRESS' | 'FINISHED' | 'ERROR';
  error_message?: string;
}

export interface PaginationParams {
  since?: number;
  until?: number;
  limit?: number;
  after?: string;
  before?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  maxRetries?: number;
}

// ==================== Rate Limiter ====================

class RateLimiter {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestInWindow = this.requests[0]!;
      const waitTime = this.windowMs - (now - oldestInWindow) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.requests.push(now);
  }
}

// ==================== Client ====================

export class ThreadsApiClient {
  private baseUrl = THREADS_API_BASE_URL;
  private rateLimiter = new RateLimiter(200, 60 * 60 * 1000); // 200 req/hour default
  private searchRateLimiter = new RateLimiter(30, 60 * 60 * 1000); // Stricter for search

  constructor(private accessToken: string) {}

  // ==================== Static Token Methods ====================

  static async exchangeForLongLived(
    shortLivedToken: string,
    clientSecret: string
  ): Promise<TokenResponse> {
    const url = new URL(`${THREADS_API_BASE_URL}/access_token`);
    url.searchParams.set('grant_type', 'th_exchange_token');
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('access_token', shortLivedToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ThreadsApiError(
        `Token exchange failed: ${response.status}`,
        response.status,
        error
      );
    }
    return response.json() as Promise<TokenResponse>;
  }

  static async refreshToken(token: string): Promise<TokenResponse> {
    const url = new URL(`${THREADS_API_BASE_URL}/refresh_access_token`);
    url.searchParams.set('grant_type', 'th_refresh_token');
    url.searchParams.set('access_token', token);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ThreadsApiError(
        `Token refresh failed: ${response.status}`,
        response.status,
        error
      );
    }
    return response.json() as Promise<TokenResponse>;
  }

  // ==================== Profile ====================

  async getMyProfile(fields?: string[]): Promise<ThreadsProfile> {
    const defaultFields = [
      'id',
      'username',
      'threads_profile_picture_url',
      'threads_biography',
      'is_verified',
    ];
    return this.request<ThreadsProfile>('/me', {
      params: { fields: (fields ?? defaultFields).join(',') },
    });
  }

  async getPublicProfile(
    userId: string,
    fields?: string[]
  ): Promise<ThreadsProfile> {
    const defaultFields = [
      'id',
      'username',
      'threads_profile_picture_url',
      'threads_biography',
      'is_verified',
    ];
    return this.request<ThreadsProfile>(`/${userId}`, {
      params: { fields: (fields ?? defaultFields).join(',') },
    });
  }

  // ==================== Threads (Own) ====================

  async getMyThreads(
    params?: PaginationParams
  ): Promise<PaginatedResponse<ThreadsMedia>> {
    return this.request<PaginatedResponse<ThreadsMedia>>('/me/threads', {
      params: {
        fields:
          'id,media_type,text,timestamp,permalink,username,topic_tag,link_attachment_url,media_url,thumbnail_url,is_quote_post,has_replies',
        limit: params?.limit,
        since: params?.since,
        until: params?.until,
        after: params?.after,
        before: params?.before,
      },
    });
  }

  async getMyReplies(
    params?: PaginationParams
  ): Promise<PaginatedResponse<ThreadsMedia>> {
    return this.request<PaginatedResponse<ThreadsMedia>>('/me/replies', {
      params: {
        fields: 'id,media_type,text,timestamp,permalink,username,replied_to',
        limit: params?.limit,
        after: params?.after,
      },
    });
  }

  // ==================== Media Details ====================

  async getMedia(mediaId: string, fields?: string[]): Promise<ThreadsMedia> {
    const defaultFields = [
      'id',
      'media_product_type',
      'media_type',
      'media_url',
      'permalink',
      'owner',
      'username',
      'text',
      'timestamp',
      'shortcode',
      'thumbnail_url',
      'children',
      'is_quote_post',
      'has_replies',
      'root_post',
      'replied_to',
      'is_reply',
      'hide_status',
      'reply_audience',
      'topic_tag',
      'link_attachment_url',
    ];
    return this.request<ThreadsMedia>(`/${mediaId}`, {
      params: { fields: (fields ?? defaultFields).join(',') },
    });
  }

  async getMediaInsights(
    mediaId: string,
    metrics: string[]
  ): Promise<MediaInsights> {
    return this.request<MediaInsights>(`/${mediaId}/insights`, {
      params: { metric: metrics.join(',') },
    });
  }

  // ==================== User Insights ====================

  async getUserInsights(params: {
    metric: string[];
    since?: number;
    until?: number;
    breakdown?: string;
  }): Promise<UserInsights> {
    return this.request<UserInsights>('/me/threads_insights', {
      params: {
        metric: params.metric.join(','),
        since: params.since,
        until: params.until,
        breakdown: params.breakdown,
      },
    });
  }

  // ==================== Keyword Search ====================

  async keywordSearch(params: {
    q: string;
    since?: number;
    until?: number;
    media_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    after?: string;
  }): Promise<PaginatedResponse<ThreadsMedia>> {
    await this.searchRateLimiter.waitForSlot();
    return this.request<PaginatedResponse<ThreadsMedia>>('/keyword_search', {
      params: {
        q: params.q,
        fields:
          'id,text,timestamp,media_type,permalink,username,topic_tag,link_attachment_url',
        since: params.since,
        until: params.until,
        media_type: params.media_type,
        after: params.after,
      },
    });
  }

  // ==================== Publishing ====================

  async createContainer(
    params: CreateContainerParams
  ): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      media_type: params.media_type,
    };

    if (params.text) body.text = params.text;
    if (params.image_url) body.image_url = params.image_url;
    if (params.video_url) body.video_url = params.video_url;
    if (params.reply_to_id) body.reply_to_id = params.reply_to_id;
    if (params.reply_control) body.reply_control = params.reply_control;
    if (params.topic_tag) body.topic_tag = params.topic_tag;
    if (params.link_attachment_url)
      body.link_attachment_url = params.link_attachment_url;
    if (params.location_id) body.location_id = params.location_id;
    if (params.poll) body.poll = params.poll;
    if (params.children) body.children = params.children;

    return this.request<{ id: string }>(`/${params.user_id}/threads`, {
      method: 'POST',
      body,
    });
  }

  async getContainerStatus(containerId: string): Promise<ContainerStatus> {
    return this.request<ContainerStatus>(`/${containerId}`, {
      params: { fields: 'id,status,error_message' },
    });
  }

  async waitForContainer(
    containerId: string,
    maxAttempts = 30,
    intervalMs = 2000
  ): Promise<ContainerStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getContainerStatus(containerId);
      if (status.status === 'FINISHED' || status.status === 'ERROR') {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new ThreadsApiError('Container creation timed out', 408);
  }

  async publish(
    userId: string,
    creationId: string
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/${userId}/threads_publish`, {
      method: 'POST',
      body: { creation_id: creationId },
    });
  }

  /**
   * Full publish flow: create container → wait → publish
   */
  async publishPost(
    params: CreateContainerParams
  ): Promise<{ id: string }> {
    const container = await this.createContainer(params);
    const status = await this.waitForContainer(container.id);

    if (status.status === 'ERROR') {
      throw new ThreadsApiError(
        `Container creation failed: ${status.error_message ?? 'Unknown error'}`,
        400
      );
    }

    return this.publish(params.user_id, container.id);
  }

  // ==================== Replies ====================

  async getReplies(
    mediaId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<ThreadsMedia>> {
    return this.request<PaginatedResponse<ThreadsMedia>>(
      `/${mediaId}/replies`,
      {
        params: {
          fields: 'id,text,timestamp,username,permalink,media_type',
          after: params?.after,
        },
      }
    );
  }

  async getConversation(
    mediaId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<ThreadsMedia>> {
    return this.request<PaginatedResponse<ThreadsMedia>>(
      `/${mediaId}/conversation`,
      {
        params: {
          fields: 'id,text,timestamp,username,permalink,media_type',
          after: params?.after,
        },
      }
    );
  }

  async hideReply(replyId: string, hide: boolean): Promise<void> {
    await this.request(`/${replyId}`, {
      method: 'POST',
      body: { hide },
    });
  }

  // ==================== Embedding ====================

  async getOembed(url: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/oembed_thread', {
      params: { url },
    });
  }

  // ==================== Core Request Handler ====================

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', params, body, maxRetries = 3 } = options;

    await this.rateLimiter.waitForSlot();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('access_token', this.accessToken);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (body && method === 'POST') {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url.toString(), fetchOptions);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : Math.pow(2, attempt + 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new ThreadsApiError(
            `Threads API error: ${response.status} ${response.statusText}`,
            response.status,
            errorBody
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof ThreadsApiError && error.status < 500) {
          throw error; // Don't retry client errors (except 429 handled above)
        }

        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt + 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }
}

// ==================== Auto-Paginate Helper ====================

export async function* paginateAll<T>(
  fetcher: (cursor?: string) => Promise<PaginatedResponse<T>>
): AsyncGenerator<T> {
  let cursor: string | undefined;

  do {
    const response = await fetcher(cursor);

    for (const item of response.data) {
      yield item;
    }

    cursor = response.paging?.cursors?.after;
  } while (cursor);
}

// ==================== Error Class ====================

export class ThreadsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ThreadsApiError';
  }
}
