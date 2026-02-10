export default defineBackground(() => {
  console.log('ThreadScope background worker initialized');

  // Listen for messages from content scripts
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_AUTH') {
      // Return stored auth token
      browser.storage.local.get('apiKey').then((result) => {
        sendResponse({ apiKey: result.apiKey || null });
      });
      return true; // Keep message channel open for async response
    }

    if (message.type === 'API_REQUEST') {
      // Proxy API requests through background to avoid CORS
      handleApiRequest(message.endpoint, message.options)
        .then(sendResponse)
        .catch((err) => sendResponse({ error: err.message }));
      return true;
    }
  });

  // ==================== Alarm-based Polling ====================

  // Create alarm for periodic alert checks
  browser.alarms.create('check-alerts', { periodInMinutes: 5 });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'check-alerts') {
      try {
        const { apiKey } = await browser.storage.local.get('apiKey');
        if (!apiKey) return;

        const data = await handleApiRequest('/notifications');
        const alerts = (data as { alerts?: Array<{ id: string }> })?.alerts ?? [];
        const count = alerts.length;

        if (count > 0) {
          await browser.action.setBadgeText({ text: String(count) });
          await browser.action.setBadgeBackgroundColor({ color: '#ef4444' });
        } else {
          await browser.action.setBadgeText({ text: '' });
        }
      } catch {
        // Polling failed, clear badge
        await browser.action.setBadgeText({ text: '' });
      }
    }
  });
});

async function handleApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<unknown> {
  const { apiKey, apiUrl } = await browser.storage.local.get(['apiKey', 'apiUrl']);
  const baseUrl = apiUrl || 'http://localhost:4000';

  const response = await fetch(`${baseUrl}/api/v1/ext${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey || '',
      'X-Extension-Version': browser.runtime.getManifest().version,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
