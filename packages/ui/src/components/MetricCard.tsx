import React from 'react';
import { TrendDirection } from './TrendDirection.js';

export interface MetricCardProps {
  /** The main metric value to display (e.g. "12.4K" or 1540) */
  value: string | number;
  /** Descriptive label shown below the value */
  label: string;
  /** Optional percentage change from the previous period */
  change?: number;
  /** Optional label for the change context (e.g. "vs last week") */
  changeLabel?: string;
}

/**
 * A stat card that displays a single metric with its label and optional
 * trend-change indicator.
 */
export function MetricCard({
  value,
  label,
  change,
  changeLabel,
}: MetricCardProps): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 16,
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
      }}
    >
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.2,
          color: '#111827',
        }}
      >
        {value}
      </span>

      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>

      {change !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 4,
          }}
        >
          <TrendDirection value={change} size="sm" />
          {changeLabel && (
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
