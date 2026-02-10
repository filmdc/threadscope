// -------------------------------------------------------
// Compose / scheduling types
// -------------------------------------------------------

import type { MediaType, ReplyAudience } from './threads-api.js';

/** Input for composing a new post */
export interface ComposePostInput {
  text: string;
  mediaType: MediaType;
  mediaUrls?: string[];
  replyToId?: string;
  replyControl?: ReplyAudience;
  topicTag?: string;
  pollOptions?: string[];
  pollDuration?: number;
  linkUrl?: string;
  locationId?: string;
}

/** Input for scheduling a post for later */
export interface SchedulePostInput extends ComposePostInput {
  scheduledFor: string;
}

/** Status of a scheduled post */
export type ScheduledPostStatus =
  | 'pending'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

/** Persisted scheduled post data */
export interface ScheduledPostData {
  id: string;
  text: string;
  mediaType: MediaType;
  scheduledFor: string;
  status: ScheduledPostStatus;
  createdAt: string;
}
