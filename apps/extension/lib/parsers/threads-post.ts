export interface ParsedPost {
  username: string;
  text: string;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  timestamp: string;
  mediaType: 'none' | 'image' | 'video' | 'carousel';
  mediaCount: number;
}

export function parsePostPage(): ParsedPost | null {
  try {
    const path = window.location.pathname;
    const usernameMatch = path.match(/^\/@([\w.]+)\/post\//);
    if (!usernameMatch) return null;

    const username = usernameMatch[1];

    // Find the main post content (first post on the page, not replies)
    const postContainer = document.querySelector(
      '[data-pressable-container="true"], article, [role="article"]'
    );
    if (!postContainer) return null;

    // Post text
    const textElements = postContainer.querySelectorAll('[dir="auto"]');
    let text = '';
    for (const el of textElements) {
      const content = el.textContent?.trim() ?? '';
      if (content.length > 0 && content !== username) {
        text = content;
        break;
      }
    }

    // Engagement counts - parse from button labels or aria-labels
    function parseCount(pattern: RegExp): number {
      const buttons = postContainer!.querySelectorAll('button, [role="button"]');
      for (const btn of buttons) {
        const label =
          btn.getAttribute('aria-label') ?? btn.textContent ?? '';
        const match = label.match(pattern);
        if (match) {
          return parseEngagementNumber(match[1]);
        }
      }
      return 0;
    }

    const likes = parseCount(/(\d[\d,.]*[KkMm]?)\s*like/i);
    const replies = parseCount(/(\d[\d,.]*[KkMm]?)\s*repl/i);
    const reposts = parseCount(/(\d[\d,.]*[KkMm]?)\s*repost/i);
    const quotes = parseCount(/(\d[\d,.]*[KkMm]?)\s*quote/i);

    // Timestamp
    const timeEl = postContainer.querySelector('time');
    const timestamp = timeEl?.getAttribute('datetime') ?? timeEl?.textContent ?? '';

    // Media detection
    const images = postContainer.querySelectorAll('img[src*="scontent"]');
    const videos = postContainer.querySelectorAll('video');
    let mediaType: ParsedPost['mediaType'] = 'none';
    let mediaCount = 0;

    if (videos.length > 0) {
      mediaType = 'video';
      mediaCount = videos.length;
    } else if (images.length > 1) {
      mediaType = 'carousel';
      mediaCount = images.length;
    } else if (images.length === 1) {
      mediaType = 'image';
      mediaCount = 1;
    }

    return {
      username,
      text,
      likes,
      replies,
      reposts,
      quotes,
      timestamp,
      mediaType,
      mediaCount,
    };
  } catch {
    return null;
  }
}

function parseEngagementNumber(str: string): number {
  const cleaned = str.replace(/,/g, '').trim();
  const multiplierMatch = cleaned.match(/^([\d.]+)([KkMm]?)$/);
  if (!multiplierMatch) return 0;

  const num = parseFloat(multiplierMatch[1]);
  const suffix = multiplierMatch[2].toLowerCase();

  switch (suffix) {
    case 'k':
      return Math.round(num * 1000);
    case 'm':
      return Math.round(num * 1000000);
    default:
      return Math.round(num);
  }
}
