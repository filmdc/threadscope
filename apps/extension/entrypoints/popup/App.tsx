import React, { useEffect, useState } from 'react';
import { getApiKey, setApiKey } from '../../lib/auth';
import { api } from '../../lib/api';

interface UserInfo {
  username?: string;
  name?: string;
  profilePicUrl?: string;
  plan?: string;
  threadsConnected?: boolean;
}

interface AlertItem {
  id: string;
  type: string;
  isActive: boolean;
  lastTriggered: string | null;
  triggerCount: number;
}

interface ScheduledItem {
  id: string;
  text: string;
  scheduledFor: string;
  status: string;
}

interface DashboardStats {
  postsToday: number;
  totalLikes: number;
  totalReplies: number;
  alertCount: number;
  scheduledCount: number;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    postsToday: 0,
    totalLikes: 0,
    totalReplies: 0,
    alertCount: 0,
    scheduledCount: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const key = await getApiKey();
      if (key) {
        setAuthenticated(true);
        await loadDashboard();
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    try {
      const [me, notifications, scheduledRes] = await Promise.allSettled([
        api.getMe(),
        api.getNotifications(),
        api.getScheduled(),
      ]);

      if (me.status === 'fulfilled') {
        const data = me.value as {
          user?: { id?: string; email?: string; name?: string; plan?: string };
          threadsConnection?: { username?: string; profilePictureUrl?: string };
        };
        setUser({
          username: data.threadsConnection?.username,
          name: data.user?.name,
          profilePicUrl: data.threadsConnection?.profilePictureUrl,
          plan: data.user?.plan,
          threadsConnected: !!data.threadsConnection,
        });
      }

      if (notifications.status === 'fulfilled') {
        const data = notifications.value as { alerts?: AlertItem[] };
        const alertList = data.alerts ?? [];
        setAlerts(alertList);
        setStats((prev) => ({ ...prev, alertCount: alertList.length }));
      }

      if (scheduledRes.status === 'fulfilled') {
        const data = scheduledRes.value as { posts?: ScheduledItem[] };
        const postList = data.posts ?? [];
        setScheduled(postList);
        setStats((prev) => ({ ...prev, scheduledCount: postList.length }));
      }
    } catch {
      // Dashboard data unavailable
    }
  }

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) {
      setError('Please enter an API key');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await setApiKey(apiKeyInput.trim());
      setAuthenticated(true);
      await loadDashboard();
    } catch {
      setError('Failed to save API key');
    } finally {
      setLoading(false);
    }
  }

  function openDashboard() {
    browser.tabs.create({ url: 'https://app.threadscope.com' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="p-6 bg-gray-50 min-h-[400px]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">T</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">ThreadScope</h1>
          <p className="text-sm text-gray-500 mt-1">Threads Intelligence Platform</p>
        </div>

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
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
              placeholder="ts_xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleSaveApiKey}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Connect
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-400 mt-4">
              Don't have an account?{' '}
              <a
                href="https://app.threadscope.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Sign up for ThreadScope
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">ThreadScope</h1>
            {user?.username && (
              <p className="text-xs text-gray-500">@{user.username}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.plan && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {user.plan}
            </span>
          )}
          <button
            onClick={openDashboard}
            className="text-xs text-blue-500 hover:underline"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500">Alerts</p>
          <p className="text-xl font-semibold text-gray-900">
            {stats.alertCount}
            {stats.alertCount > 0 && (
              <span className="ml-1 inline-block w-2 h-2 bg-red-500 rounded-full" />
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500">Scheduled</p>
          <p className="text-xl font-semibold text-gray-900">{stats.scheduledCount}</p>
        </div>
      </div>

      {/* Scheduled Posts List */}
      {scheduled.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Upcoming Posts</p>
          </div>
          <div className="divide-y divide-gray-100">
            {scheduled.slice(0, 3).map((post) => (
              <div key={post.id} className="px-3 py-2">
                <p className="text-xs text-gray-800 truncate">{post.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(post.scheduledFor).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Recent Alerts</p>
          </div>
          <div className="divide-y divide-gray-100">
            {alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-800">{alert.type.replace(/_/g, ' ')}</p>
                  {alert.lastTriggered && (
                    <p className="text-xs text-gray-400">
                      {new Date(alert.lastTriggered).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{alert.triggerCount}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <button
          onClick={openDashboard}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Open Full Dashboard
        </button>
        <button
          onClick={() => browser.runtime.openOptionsPage()}
          className="w-full bg-white text-gray-700 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
