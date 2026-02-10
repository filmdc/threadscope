// -------------------------------------------------------
// Report types
// -------------------------------------------------------

/** Available report types */
export type ReportType =
  | 'ACCOUNT_PERFORMANCE'
  | 'POST_PERFORMANCE'
  | 'KEYWORD_TREND'
  | 'CREATOR_DISCOVERY'
  | 'COMPETITOR_BENCHMARK'
  | 'CONTENT_ANALYSIS'
  | 'AUDIENCE_INSIGHTS'
  | 'TOPIC_LANDSCAPE';

/** Status of a report generation job */
export type ReportStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

/** Configuration for generating a report */
export interface ReportConfig {
  type: ReportType;
  parameters: Record<string, unknown>;
}

/** Persisted report data */
export interface ReportData {
  id: string;
  name: string;
  type: ReportType;
  status: ReportStatus;
  resultSummary: string;
  resultCount: number;
  processingTime: number;
  createdAt: string;
  completedAt: string | null;
}
