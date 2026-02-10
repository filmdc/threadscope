export async function getApiKey(): Promise<string | null> {
  const result = await browser.storage.local.get('apiKey');
  return result.apiKey || null;
}

export async function setApiKey(key: string): Promise<void> {
  await browser.storage.local.set({ apiKey: key });
}

export async function clearApiKey(): Promise<void> {
  await browser.storage.local.remove('apiKey');
}

export async function isAuthenticated(): Promise<boolean> {
  const key = await getApiKey();
  return !!key;
}
