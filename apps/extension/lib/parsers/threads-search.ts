export interface ParsedSearchResult {
  type: 'user' | 'post';
  username: string;
  displayName: string;
  text: string;
  isVerified: boolean;
  followerCount: string;
}

export function parseSearchResults(): ParsedSearchResult[] {
  const results: ParsedSearchResult[] = [];

  try {
    // Search results on Threads appear as a list of users or posts
    const resultElements = document.querySelectorAll(
      '[data-pressable-container="true"], [role="listitem"], [role="option"]'
    );

    for (const el of resultElements) {
      try {
        // Look for a link to a user profile
        const profileLink = el.querySelector('a[href^="/@"]');
        if (!profileLink) continue;

        const href = profileLink.getAttribute('href') ?? '';
        const usernameMatch = href.match(/^\/@([\w.]+)/);
        if (!usernameMatch) continue;

        const username = usernameMatch[1];

        // Determine if this is a user result or a post result
        const isPostResult = href.includes('/post/');

        // Display name
        const nameEl = el.querySelector('span[dir="auto"], [role="heading"]');
        const displayName = nameEl?.textContent?.trim() ?? username;

        // Text content (bio for users, post text for posts)
        const textElements = el.querySelectorAll('[dir="auto"]');
        let text = '';
        for (const textEl of textElements) {
          const content = textEl.textContent?.trim() ?? '';
          if (content !== displayName && content !== username && content.length > 0) {
            text = content;
            break;
          }
        }

        // Verified badge
        const isVerified = !!el.querySelector(
          'svg[aria-label="Verified"], [title="Verified"]'
        );

        // Follower count for user results
        let followerCount = '';
        if (!isPostResult) {
          const spans = el.querySelectorAll('span');
          for (const span of spans) {
            const spanText = span.textContent?.trim().toLowerCase() ?? '';
            if (spanText.includes('follower')) {
              followerCount = span.textContent?.trim() ?? '';
              break;
            }
          }
        }

        results.push({
          type: isPostResult ? 'post' : 'user',
          username,
          displayName,
          text,
          isVerified,
          followerCount,
        });
      } catch {
        // Skip unparseable results
      }
    }
  } catch {
    // Return empty results on failure
  }

  return results;
}
