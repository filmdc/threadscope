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
