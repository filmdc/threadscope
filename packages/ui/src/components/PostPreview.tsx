import React from 'react';
import { MediaTypeBadge } from './MediaTypeBadge.js';
import { TimeAgo } from './TimeAgo.js';

export interface PostPreviewProps {
  /** Post body text (will be truncated if long) */
  text: string;
  /** Media type of the post */
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  /** Number of likes */
  likes: number;
  /** Number of replies */
  replies: number;
  /** Number of reposts */
  reposts: number;
  /** Permalink to the original post */
  permalink: string;
  /** Author username */
  username: string;
  /** When the post was published */
  publishedAt: Date | string;
}

const TRUNCATE_LENGTH = 140;

/**
 * Compact preview card for a Threads post showing a text snippet,
 * media type badge, and basic engagement metrics.
 */
export function PostPreview({
  text,
  mediaType,
  likes,
  replies,
  reposts,
  permalink,
  username,
  publishedAt,
}: PostPreviewProps): React.JSX.Element {
  const truncatedText =
    text.length > TRUNCATE_LENGTH
      ? `${text.slice(0, TRUNCATE_LENGTH)}...`
      : text;

  return (
    <a
      href={permalink}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        padding: 14,
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
        transition: 'box-shadow 150ms ease',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
            @{username}
          </span>
          <MediaTypeBadge mediaType={mediaType} />
        </div>
        <TimeAgo date={publishedAt} />
      </div>

      {/* Text snippet */}
      <p
        style={{
          margin: '0 0 10px',
          fontSize: 14,
          lineHeight: 1.5,
          color: '#374151',
        }}
      >
        {truncatedText}
      </p>

      {/* Metrics row */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          fontSize: 13,
          color: '#6b7280',
        }}
      >
        <span title="Likes">{'\u2764'} {likes}</span>
        <span title="Replies">{'\uD83D\uDCAC'} {replies}</span>
        <span title="Reposts">{'\uD83D\uDD01'} {reposts}</span>
      </div>
    </a>
  );
}
