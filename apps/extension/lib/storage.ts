interface StorageData {
  apiKey: string | null;
  apiUrl: string;
  overlayEnabled: boolean;
  notificationsEnabled: boolean;
  cachedUser: Record<string, unknown> | null;
}

const defaults: StorageData = {
  apiKey: null,
  apiUrl: 'https://api.threadscope.com',
  overlayEnabled: true,
  notificationsEnabled: true,
  cachedUser: null,
};

export async function getStorage<K extends keyof StorageData>(
  key: K
): Promise<StorageData[K]> {
  const result = await browser.storage.local.get(key);
  return (result[key] as StorageData[K]) ?? defaults[key];
}

export async function setStorage<K extends keyof StorageData>(
  key: K,
  value: StorageData[K]
): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}
