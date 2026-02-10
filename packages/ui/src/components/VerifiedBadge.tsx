import React from 'react';

export interface VerifiedBadgeProps {
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<string, number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

/**
 * Threads-style verified checkmark badge rendered as an inline SVG.
 */
export function VerifiedBadge({
  size = 'md',
}: VerifiedBadgeProps): React.JSX.Element {
  const px = SIZE_MAP[size] ?? SIZE_MAP['md']!;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verified"
      role="img"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="12" fill="#0095F6" />
      <path
        d="M9.5 12.5L11 14L15 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
