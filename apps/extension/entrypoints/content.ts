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
    }

    // Initial page detection
    const initialPage = detectPageType();
    console.log(`[ThreadScope] Initial page: ${initialPage}`);
    onPageChange(initialPage);
  },
});
