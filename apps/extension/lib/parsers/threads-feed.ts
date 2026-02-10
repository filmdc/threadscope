export interface ParsedFeedPost {
  username: string;
  text: string;
  likes: number;
  replies: number;
  reposts: number;
  timestamp: string;
  hasMedia: boolean;
}

export function parseFeedPosts(): ParsedFeedPost[] {
  // DOM parsing for threads.net feed
  // This will need to be updated as Threads changes their DOM structure
  const posts: ParsedFeedPost[] = [];

  // Threads uses React and dynamic class names, so we look for structural patterns
  // This is a best-effort parser that will need maintenance
  const postElements = document.querySelectorAll('[data-pressable-container="true"]');

  for (const el of postElements) {
    try {
      const usernameEl = el.querySelector('a[href^="/@"] span');
      const textEl = el.querySelector('[dir="auto"]');

      if (usernameEl && textEl) {
        posts.push({
          username: usernameEl.textContent?.replace('@', '') ?? '',
          text: textEl.textContent ?? '',
          likes: 0, // Extracted from engagement buttons
          replies: 0,
          reposts: 0,
          timestamp: '',
          hasMedia: !!el.querySelector('img[src*="scontent"], video'),
        });
      }
    } catch {
      // Skip unparseable elements
    }
  }

  return posts;
}
