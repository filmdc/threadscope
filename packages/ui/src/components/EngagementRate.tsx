import React from 'react';

export interface EngagementRateProps {
  /** Engagement rate as a percentage value (e.g. 2.5 means 2.5%) */
  rate: number;
  /** Display size */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<string, { fontSize: number; dotSize: number }> = {
  sm: { fontSize: 12, dotSize: 6 },
  md: { fontSize: 14, dotSize: 8 },
  lg: { fontSize: 18, dotSize: 10 },
};

/**
 * Return the colour for the engagement rate.
 * - Red    : rate < 1 %
 * - Yellow : rate 1 - 3 %
 * - Green  : rate > 3 %
 */
function getColor(rate: number): string {
  if (rate < 1) return '#dc2626';
  if (rate <= 3) return '#ca8a04';
  return '#16a34a';
}

/**
 * Displays the engagement rate as a formatted percentage with a
 * colour-coded dot to indicate performance level.
 */
export function EngagementRate({
  rate,
  size = 'md',
}: EngagementRateProps): React.JSX.Element {
  const { fontSize, dotSize } = SIZE_MAP[size] ?? SIZE_MAP['md']!;
  const color = getColor(rate);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize,
        fontWeight: 600,
        color,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {rate.toFixed(2)}%
    </span>
  );
}
