export type MessageType =
  | { type: 'GET_AUTH' }
  | { type: 'API_REQUEST'; endpoint: string; options?: RequestInit }
  | { type: 'PAGE_CHANGE'; pageType: string; path: string }
  | { type: 'OVERLAY_TOGGLE'; enabled: boolean };

export function sendMessage<T>(message: MessageType): Promise<T> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(message, (response) => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError.message));
      } else {
        resolve(response as T);
      }
    });
  });
}
