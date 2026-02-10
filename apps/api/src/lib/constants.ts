export const THREADS_API_BASE_URL = 'https://graph.threads.net/v1.0';
export const THREADS_OAUTH_URL = 'https://api.instagram.com/oauth/authorize';
export const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';

export const THREADS_SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_insights',
  'threads_manage_replies',
  'threads_keyword_search',
  'threads_read_replies',
] as const;

export const DATA_AVAILABLE_FROM = 1712991600; // April 13, 2024 Unix timestamp

export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';
export const LONG_LIVED_TOKEN_DAYS = 60;
export const TOKEN_REFRESH_BUFFER_DAYS = 7;
