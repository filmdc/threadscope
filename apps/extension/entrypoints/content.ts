export default defineContentScript({
  matches: ['https://www.threads.net/*', 'https://threads.net/*'],
  main() {
    console.log('ThreadScope content script loaded on threads.net');

    // Detect current page type
    function detectPageType(): 'feed' | 'profile' | 'post' | 'search' | 'topic' | 'unknown' {
      const path = window.location.pathname;
      if (path === '/' || path === '') return 'feed';
      if (path.match(/^\/search/)) return 'search';
      if (path.match(/^\/topic\//)) return 'topic';
      if (path.match(/^\/@[\w.]+\/post\//)) return 'post';
      if (path.match(/^\/@[\w.]+/)) return 'profile';
      return 'unknown';
    }

    // ==================== Shadow DOM Overlay Host ====================

    let overlayHost: HTMLElement | null = null;
    let shadowRoot: ShadowRoot | null = null;

    function getOverlayContainer(): HTMLElement {
      if (overlayHost && document.body.contains(overlayHost)) {
        return shadowRoot!.querySelector('#ts-overlay-root')!;
      }

      overlayHost = document.createElement('div');
      overlayHost.id = 'threadscope-overlay-host';
      overlayHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 999999; pointer-events: none;';
      document.body.appendChild(overlayHost);

      shadowRoot = overlayHost.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `
        #ts-overlay-root { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; }
        .ts-card { pointer-events: auto; position: fixed; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1e293b; max-width: 280px; border: 1px solid #e2e8f0; }
        .ts-card-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; }
        .ts-card-stat { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
        .ts-card-stat:last-child { border-bottom: none; }
        .ts-card-label { color: #64748b; }
        .ts-card-value { font-weight: 600; }
        .ts-badge { pointer-events: auto; position: fixed; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; border-radius: 8px; padding: 6px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(59,130,246,0.3); cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .ts-badge:hover { transform: scale(1.05); }
        .ts-close { position: absolute; top: 8px; right: 8px; cursor: pointer; color: #94a3b8; background: none; border: none; font-size: 16px; line-height: 1; }
        .ts-close:hover { color: #475569; }
      `;
      shadowRoot.appendChild(style);

      const root = document.createElement('div');
      root.id = 'ts-overlay-root';
      shadowRoot.appendChild(root);

      return root;
    }

    function clearOverlays() {
      if (shadowRoot) {
        const root = shadowRoot.querySelector('#ts-overlay-root');
        if (root) root.innerHTML = '';
      }
    }

    // ==================== Post Insights Overlay ====================

    async function showPostInsights() {
      const path = window.location.pathname;
      // Extract post ID from URL pattern /@username/post/MEDIA_ID
      const postMatch = path.match(/^\/@[\w.]+\/post\/([^/]+)/);
      if (!postMatch) return;

      const threadsMediaId = postMatch[1];
      if (!threadsMediaId) return;

      try {
        const response = await browser.runtime.sendMessage({
          type: 'API_REQUEST',
          endpoint: `/post/${threadsMediaId}`,
        }) as { error?: string; post?: { likes?: number; replies?: number; reposts?: number; views?: number; engagementRate?: number; text?: string } };

        if (response.error || !response.post) return;

        const post = response.post;
        const container = getOverlayContainer();

        const badge = document.createElement('div');
        badge.className = 'ts-badge';
        badge.style.cssText = 'bottom: 80px; right: 20px;';
        badge.innerHTML = `
          <span>TS</span>
          <span>${post.likes ?? 0} likes · ${post.replies ?? 0} replies</span>
        `;

        const card = document.createElement('div');
        card.className = 'ts-card';
        card.style.cssText = 'bottom: 120px; right: 20px; display: none;';
        card.innerHTML = `
          <button class="ts-close">&times;</button>
          <div class="ts-card-title">ThreadScope Insights</div>
          <div class="ts-card-stat"><span class="ts-card-label">Likes</span><span class="ts-card-value">${post.likes ?? 0}</span></div>
          <div class="ts-card-stat"><span class="ts-card-label">Replies</span><span class="ts-card-value">${post.replies ?? 0}</span></div>
          <div class="ts-card-stat"><span class="ts-card-label">Reposts</span><span class="ts-card-value">${post.reposts ?? 0}</span></div>
          ${post.views != null ? `<div class="ts-card-stat"><span class="ts-card-label">Views</span><span class="ts-card-value">${post.views}</span></div>` : ''}
          ${post.engagementRate != null ? `<div class="ts-card-stat"><span class="ts-card-label">Engagement</span><span class="ts-card-value">${(post.engagementRate * 100).toFixed(2)}%</span></div>` : ''}
        `;

        badge.addEventListener('click', () => {
          card.style.display = card.style.display === 'none' ? 'block' : 'none';
        });

        const closeBtn = card.querySelector('.ts-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => { card.style.display = 'none'; });
        }

        container.appendChild(badge);
        container.appendChild(card);
      } catch {
        // Silently fail if API is unavailable
      }
    }

    // ==================== Creator Card Overlay ====================

    async function showCreatorCard() {
      const path = window.location.pathname;
      // Extract username from URL pattern /@username
      const profileMatch = path.match(/^\/@([\w.]+)$/);
      if (!profileMatch) return;

      const username = profileMatch[1];
      if (!username) return;

      try {
        const response = await browser.runtime.sendMessage({
          type: 'API_REQUEST',
          endpoint: `/creator/${username}`,
        }) as { error?: string; creator?: { username?: string; avgLikes?: number; avgReplies?: number; avgReposts?: number; avgEngagement?: number; observedPostCount?: number; postFrequency?: string; primaryTopics?: string[] } };

        if (response.error || !response.creator) return;

        const creator = response.creator;
        const container = getOverlayContainer();

        const card = document.createElement('div');
        card.className = 'ts-card';
        card.style.cssText = 'top: 80px; right: 20px;';
        card.innerHTML = `
          <button class="ts-close">&times;</button>
          <div class="ts-card-title">@${creator.username ?? username}</div>
          <div class="ts-card-stat"><span class="ts-card-label">Avg Engagement</span><span class="ts-card-value">${creator.avgEngagement != null ? (creator.avgEngagement * 100).toFixed(1) + '%' : 'N/A'}</span></div>
          <div class="ts-card-stat"><span class="ts-card-label">Avg Likes</span><span class="ts-card-value">${creator.avgLikes?.toFixed(0) ?? 'N/A'}</span></div>
          <div class="ts-card-stat"><span class="ts-card-label">Avg Replies</span><span class="ts-card-value">${creator.avgReplies?.toFixed(0) ?? 'N/A'}</span></div>
          <div class="ts-card-stat"><span class="ts-card-label">Posts Observed</span><span class="ts-card-value">${creator.observedPostCount ?? 0}</span></div>
          ${creator.postFrequency ? `<div class="ts-card-stat"><span class="ts-card-label">Frequency</span><span class="ts-card-value">${creator.postFrequency}</span></div>` : ''}
          ${creator.primaryTopics && creator.primaryTopics.length > 0 ? `<div class="ts-card-stat"><span class="ts-card-label">Topics</span><span class="ts-card-value">${creator.primaryTopics.slice(0, 3).join(', ')}</span></div>` : ''}
        `;

        const closeBtn = card.querySelector('.ts-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => { card.remove(); });
        }

        container.appendChild(card);
      } catch {
        // Silently fail if API is unavailable
      }
    }

    // ==================== Page Change Handler ====================

    // MutationObserver for SPA navigation
    let currentPath = window.location.pathname;

    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        const pageType = detectPageType();
        console.log(`[ThreadScope] Navigation detected: ${pageType} (${currentPath})`);
        onPageChange(pageType);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    function onPageChange(pageType: string) {
      // Notify background script of page change
      browser.runtime.sendMessage({
        type: 'PAGE_CHANGE',
        pageType,
        path: window.location.pathname,
      });

      // Clear existing overlays on navigation
      clearOverlays();

      // Inject overlays based on page type (with delay for SPA rendering)
      setTimeout(() => {
        if (pageType === 'post') {
          showPostInsights();
        } else if (pageType === 'profile') {
          showCreatorCard();
        }
      }, 1000);
    }

    // Initial page detection
    const initialPage = detectPageType();
    console.log(`[ThreadScope] Initial page: ${initialPage}`);
    onPageChange(initialPage);
  },
});
