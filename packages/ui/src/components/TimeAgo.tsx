import React from 'react';

export interface TimeAgoProps {
  /** The date to display as relative time */
  date: Date | string;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Compute a human-readable relative-time string.
 * Returns values like "just now", "3m ago", "2h ago", "5d ago", etc.
 */
function getTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  if (diff < 0) return 'just now';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE);
    return `${mins}m ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours}h ago`;
  }
  if (diff < WEEK) {
    const days = Math.floor(diff / DAY);
    return `${days}d ago`;
  }
  if (diff < MONTH) {
    const weeks = Math.floor(diff / WEEK);
    return `${weeks}w ago`;
  }
  if (diff < YEAR) {
    const months = Math.floor(diff / MONTH);
    return `${months}mo ago`;
  }
  const years = Math.floor(diff / YEAR);
  return `${years}y ago`;
}

/**
 * Displays a relative-time string (e.g. "3h ago") from a given date.
 * The `title` attribute shows the full ISO timestamp on hover.
 */
export function TimeAgo({ date }: TimeAgoProps): React.JSX.Element {
  const d = typeof date === 'string' ? new Date(date) : date;

  return (
    <time
      dateTime={d.toISOString()}
      title={d.toISOString()}
      style={{ color: '#6b7280', fontSize: 13 }}
    >
      {getTimeAgo(d)}
    </time>
  );
}
