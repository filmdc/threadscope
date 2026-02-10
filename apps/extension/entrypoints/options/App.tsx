import React, { useEffect, useState } from 'react';
import { getApiKey, setApiKey, clearApiKey, isAuthenticated } from '../../lib/auth';
import { getStorage, setStorage } from '../../lib/storage';
import { api } from '../../lib/api';

interface UserInfo {
  username?: string;
  name?: string;
  email?: string;
  plan?: string;
}

export default function App() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiUrlInput, setApiUrlInput] = useState('https://api.threadscope.com');
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const key = await getApiKey();
      const url = await getStorage('apiUrl');
      const overlay = await getStorage('overlayEnabled');
      const notifications = await getStorage('notificationsEnabled');

      if (key) {
        setApiKeyInput(maskApiKey(key));
        setAuthenticated(true);
        loadUser();
      }

      setApiUrlInput(url);
      setOverlayEnabled(overlay);
      setNotificationsEnabled(notifications);
    } catch {
      // Use defaults
    }
  }

  async function loadUser() {
    try {
      const me = await api.getMe();
      setUser(me as UserInfo);
    } catch {
      // User info unavailable
    }
  }

  function maskApiKey(key: string): string {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Only save API key if it was changed (not masked)
      if (apiKeyInput && !apiKeyInput.includes('****')) {
        await setApiKey(apiKeyInput.trim());
      }

      await setStorage('apiUrl', apiUrlInput.trim());
      await setStorage('overlayEnabled', overlayEnabled);
      await setStorage('notificationsEnabled', notificationsEnabled);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Re-check auth
      const authed = await isAuthenticated();
      setAuthenticated(authed);
      if (authed) {
        loadUser();
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    await clearApiKey();
    setAuthenticated(false);
    setUser(null);
    setApiKeyInput('');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg font-bold">T</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">ThreadScope Settings</h1>
            <p className="text-sm text-gray-500">Configure your extension preferences</p>
          </div>
        </div>

        {/* Connected Account */}
        {authenticated && user && (
          <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Connected Account</h2>
            <div className="flex items-center justify-between">
              <div>
                {user.name && (
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                )}
                {user.username && (
                  <p className="text-sm text-gray-500">@{user.username}</p>
                )}
                {user.email && (
                  <p className="text-xs text-gray-400 mt-1">{user.email}</p>
                )}
                {user.plan && (
                  <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {user.plan}
                  </span>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Disconnect
              </button>
            </div>
          </section>
        )}

        {/* API Configuration */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">API Configuration</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="ts_xxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Get your API key from{' '}
                <a
                  href="https://app.threadscope.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  ThreadScope Settings
                </a>
              </p>
            </div>

            <div>
              <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 mb-1">
                API URL
              </label>
              <input
                id="apiUrl"
                type="url"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="https://api.threadscope.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Only change this if you are self-hosting ThreadScope
              </p>
            </div>
          </div>
        </section>

        {/* Display Preferences */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Display Preferences</h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Overlay on Threads.net</p>
                <p className="text-xs text-gray-400">
                  Show analytics overlay on post and profile pages
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={overlayEnabled}
                  onChange={(e) => setOverlayEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Notification Badges</p>
                <p className="text-xs text-gray-400">
                  Show badge count on the extension icon
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
              </div>
            </label>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 text-white py-2 px-6 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {saved && (
            <span className="text-sm text-green-600 font-medium">Settings saved</span>
          )}

          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
