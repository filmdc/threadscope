export interface ParsedProfile {
  username: string;
  displayName: string;
  bio: string;
  isVerified: boolean;
  followerCount: string;
  profilePicUrl: string;
}

export function parseProfilePage(): ParsedProfile | null {
  try {
    const path = window.location.pathname;
    const usernameMatch = path.match(/^\/@([\w.]+)/);
    if (!usernameMatch) return null;

    const username = usernameMatch[1];

    // Look for the profile header area
    // Threads uses dynamic class names, so we rely on structural patterns
    const headerSection = document.querySelector('header') || document.body;

    // Display name is typically in a prominent heading element
    const headings = headerSection.querySelectorAll('h1, h2, [role="heading"]');
    let displayName = '';
    for (const h of headings) {
      const text = h.textContent?.trim();
      if (text && text !== username && !text.startsWith('@')) {
        displayName = text;
        break;
      }
    }

    // Bio text - look for elements after the username/display name area
    const bioElements = document.querySelectorAll('[dir="auto"]');
    let bio = '';
    for (const el of bioElements) {
      const text = el.textContent?.trim() ?? '';
      // Bio is typically longer than other text elements and not the display name
      if (text.length > 10 && text !== displayName && !text.startsWith('@')) {
        bio = text;
        break;
      }
    }

    // Verified badge - look for SVG verification icon
    const isVerified = !!headerSection.querySelector(
      'svg[aria-label="Verified"], [title="Verified"]'
    );

    // Follower count - look for text containing "followers"
    const allText = headerSection.querySelectorAll('span, div');
    let followerCount = '';
    for (const el of allText) {
      const text = el.textContent?.trim().toLowerCase() ?? '';
      if (text.includes('follower')) {
        followerCount = el.textContent?.trim() ?? '';
        break;
      }
    }

    // Profile picture
    const profilePic = headerSection.querySelector(
      'img[alt*="profile"], img[alt*="avatar"], img[data-testid="user-avatar"]'
    );
    const profilePicUrl = (profilePic as HTMLImageElement)?.src ?? '';

    return {
      username,
      displayName: displayName || username,
      bio,
      isVerified,
      followerCount,
      profilePicUrl,
    };
  } catch {
    return null;
  }
}
