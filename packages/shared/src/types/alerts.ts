// -------------------------------------------------------
// Alert types
// -------------------------------------------------------

/** Available alert types */
export enum AlertType {
  ENGAGEMENT_SPIKE = 'ENGAGEMENT_SPIKE',
  ENGAGEMENT_DROP = 'ENGAGEMENT_DROP',
  KEYWORD_VOLUME_SPIKE = 'KEYWORD_VOLUME_SPIKE',
  KEYWORD_TREND_CHANGE = 'KEYWORD_TREND_CHANGE',
  FOLLOWER_MILESTONE = 'FOLLOWER_MILESTONE',
  POST_PERFORMANCE = 'POST_PERFORMANCE',
  COMPETITOR_ACTIVITY = 'COMPETITOR_ACTIVITY',
}

/** Direction for threshold comparison */
export type AlertDirection = 'above' | 'below';

/** Notification channel for delivering alerts */
export type AlertChannel = 'email' | 'push' | 'in_app';

/** Condition that triggers the alert */
export interface AlertCondition {
  threshold: number;
  metric: string;
  direction: AlertDirection;
}

/** Configuration for creating / updating an alert */
export interface AlertConfig {
  type: AlertType;
  condition: AlertCondition;
  channels: AlertChannel[];
  trackedKeywordId?: string;
}

/** Persisted alert data */
export interface AlertData {
  id: string;
  type: AlertType;
  condition: AlertCondition;
  channels: AlertChannel[];
  isActive: boolean;
  lastTriggered: string | null;
  triggerCount: number;
}
