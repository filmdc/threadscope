export function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

export function observeNewElements(
  parentSelector: string,
  callback: (elements: Element[]) => void
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    const newElements: Element[] = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          newElements.push(node);
        }
      }
    }
    if (newElements.length > 0) {
      callback(newElements);
    }
  });

  const parent = document.querySelector(parentSelector);
  if (parent) {
    observer.observe(parent, { childList: true, subtree: true });
  }

  return observer;
}
