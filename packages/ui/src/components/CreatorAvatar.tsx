import React from 'react';
import { VerifiedBadge } from './VerifiedBadge.js';

export interface CreatorAvatarProps {
  /** Threads username */
  username: string;
  /** URL of the profile picture */
  profilePictureUrl: string;
  /** Whether the user is verified */
  isVerified?: boolean;
  /** Display size */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<string, { avatar: number; font: number; badgeSize: 'sm' | 'md' | 'lg' }> = {
  sm: { avatar: 28, font: 12, badgeSize: 'sm' },
  md: { avatar: 40, font: 14, badgeSize: 'sm' },
  lg: { avatar: 56, font: 16, badgeSize: 'md' },
};

/**
 * Displays a creator's profile picture alongside their username
 * and an optional verified badge.
 */
export function CreatorAvatar({
  username,
  profilePictureUrl,
  isVerified = false,
  size = 'md',
}: CreatorAvatarProps): React.JSX.Element {
  const { avatar, font, badgeSize } = SIZE_MAP[size] ?? SIZE_MAP['md']!;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <img
        src={profilePictureUrl}
        alt={`${username}'s avatar`}
        width={avatar}
        height={avatar}
        style={{
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontWeight: 600,
          fontSize: font,
          color: '#111827',
        }}
      >
        @{username}
        {isVerified && <VerifiedBadge size={badgeSize} />}
      </span>
    </div>
  );
}
