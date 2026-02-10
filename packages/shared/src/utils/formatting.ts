// -------------------------------------------------------
// Formatting utilities
// -------------------------------------------------------

/**
 * Abbreviate a number for compact display.
 *
 * @example
 * abbreviateNumber(1200)     // "1.2K"
 * abbreviateNumber(1500000)  // "1.5M"
 * abbreviateNumber(980)      // "980"
 */
export function abbreviateNumber(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000;
    return `${sign}${stripTrailingZero(v.toFixed(1))}B`;
  }
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${stripTrailingZero(v.toFixed(1))}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    return `${sign}${stripTrailingZero(v.toFixed(1))}K`;
  }
  return `${sign}${abs}`;
}

function stripTrailingZero(s: string): string {
  return s.replace(/\.0$/, '');
}

// -------------------------------------------------------
// Date formatting
// -------------------------------------------------------

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'iso';

/**
 * Format a Date (or ISO string) for display.
 *
 * - `short`  : "Jan 5"
 * - `medium` : "Jan 5, 2024"
 * - `long`   : "January 5, 2024 3:42 PM"
 * - `iso`    : "2024-01-05T15:42:00.000Z"
 */
export function formatDate(
  date: Date | string,
  format: DateFormatStyle = 'medium',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'medium':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'long':
      return d.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    case 'iso':
      return d.toISOString();
  }
}

// -------------------------------------------------------
// Percentage formatting
// -------------------------------------------------------

/**
 * Format a decimal or whole-number value as a percentage string.
 *
 * @param value    The number to format (e.g. 0.042 or 4.2)
 * @param decimals Decimal places in the output (default 1)
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format an engagement rate (0-1 scale) as a human-readable percentage.
 *
 * @example
 * formatEngagementRate(0.042)  // "4.20%"
 * formatEngagementRate(0.1)    // "10.00%"
 */
export function formatEngagementRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}
