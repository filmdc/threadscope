import React from 'react';

export interface MediaTypeBadgeProps {
  /** The media type to render a badge for */
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
}

const BADGE_STYLES: Record<
  string,
  { backgroundColor: string; color: string }
> = {
  TEXT: { backgroundColor: '#eff6ff', color: '#2563eb' },
  IMAGE: { backgroundColor: '#f0fdf4', color: '#16a34a' },
  VIDEO: { backgroundColor: '#fef3c7', color: '#d97706' },
  CAROUSEL: { backgroundColor: '#faf5ff', color: '#9333ea' },
};

/**
 * A small coloured badge that indicates the media type of a post.
 */
export function MediaTypeBadge({
  mediaType,
}: MediaTypeBadgeProps): React.JSX.Element {
  const style = BADGE_STYLES[mediaType] ?? BADGE_STYLES['TEXT']!;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        ...style,
      }}
    >
      {mediaType}
    </span>
  );
}
