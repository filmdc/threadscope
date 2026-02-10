import React from 'react';

export interface TrendDirectionProps {
  /** Percentage change value. Positive = up, negative = down, 0 = flat. */
  value: number;
  /** Display size */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<string, { fontSize: number; arrowSize: number }> = {
  sm: { fontSize: 12, arrowSize: 14 },
  md: { fontSize: 14, arrowSize: 16 },
  lg: { fontSize: 16, arrowSize: 20 },
};

/**
 * Displays an up, down, or flat arrow with a percentage value.
 * Green for positive, red for negative, gray for zero / flat.
 */
export function TrendDirection({
  value,
  size = 'md',
}: TrendDirectionProps): React.JSX.Element {
  const { fontSize, arrowSize } = SIZE_MAP[size] ?? SIZE_MAP['md']!;

  const isPositive = value > 0;
  const isNegative = value < 0;

  const color = isPositive ? '#16a34a' : isNegative ? '#dc2626' : '#9ca3af';

  const arrow = isPositive ? '\u2191' : isNegative ? '\u2193' : '\u2192';

  const displayValue = `${isPositive ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        color,
        fontWeight: 600,
        fontSize,
      }}
    >
      <span style={{ fontSize: arrowSize, lineHeight: 1 }}>{arrow}</span>
      {displayValue}
    </span>
  );
}
