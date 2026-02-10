// -------------------------------------------------------
// Threads platform constants
// -------------------------------------------------------

import { MediaType } from '../types/threads-api.js';

/** Base URL for the Threads Graph API */
export const THREADS_API_BASE_URL = 'https://graph.threads.net/v1.0';

/** OAuth authorization endpoint (via Instagram) */
export const THREADS_OAUTH_URL = 'https://api.instagram.com/oauth/authorize';

/** OAuth scopes required by the application */
export const THREADS_SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_insights',
  'threads_manage_replies',
  'threads_read_replies',
] as const;

/** Rate-limit windows and quotas for the Threads API */
export const THREADS_RATE_LIMITS = {
  /** Requests per hour per user token */
  requestsPerHour: 200,
  /** Requests per hour for application-level calls */
  appRequestsPerHour: 500,
  /** Minimum interval between publishing calls (ms) */
  publishCooldownMs: 30_000,
} as const;

/** Convenience map of media types */
export const MEDIA_TYPES = {
  TEXT: MediaType.TEXT,
  IMAGE: MediaType.IMAGE,
  VIDEO: MediaType.VIDEO,
  CAROUSEL: MediaType.CAROUSEL,
} as const;

/**
 * Unix timestamp (seconds) for April 13, 2024.
 * The Threads API only returns data starting from this date.
 */
export const DATA_AVAILABLE_FROM = 1712991600;

/** Maximum character length for a post's text body */
export const POST_TEXT_LIMIT = 500;

/** Maximum number of root posts per day */
export const POSTS_PER_DAY_LIMIT = 250;

/** Maximum number of replies per day */
export const REPLIES_PER_DAY_LIMIT = 1000;
