'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useConnectionStatus } from '@/lib/hooks/use-connection-status';
import { ConnectPrompt } from '@/components/connect-prompt';

const ALERT_TYPES = [
  { value: 'KEYWORD_SPIKE', label: 'Keyword Spike', description: 'Triggers when keyword post volume exceeds threshold.' },
  { value: 'KEYWORD_TREND_CHANGE', label: 'Keyword Trend Change', description: 'Triggers when a keyword trend direction flips.' },
  { value: 'ENGAGEMENT_MILESTONE', label: 'Engagement Milestone', description: 'Triggers when a post metric exceeds threshold.' },
  { value: 'FOLLOWER_MILESTONE', label: 'Follower Milestone', description: 'Triggers when follower count exceeds threshold.' },
  { value: 'COMPETITOR_POST', label: 'Competitor Activity', description: 'Triggers when a tracked competitor posts.' },
  { value: 'MENTION_ALERT', label: 'Mention Alert', description: 'Triggers when you are mentioned (via webhook).' },
] as const;

type AlertTypeValue = typeof ALERT_TYPES[number]['value'];

export default function AlertsPage() {
  const { data: connectionStatus } = useConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<AlertTypeValue>('KEYWORD_SPIKE');
  const [threshold, setThreshold] = useState('100');
  const [metric, setMetric] = useState('postCount');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [channels, setChannels] = useState<string[]>(['in_app']);

  const utils = trpc.useUtils();

  const { data: alerts, isLoading } = trpc.alerts.list.useQuery(undefined, {
    enabled: isConnected,
  });

  const createMutation = trpc.alerts.create.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setThreshold('100');
      utils.alerts.list.invalidate();
    },
  });

  const toggleMutation = trpc.alerts.toggle.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
    },
  });

  const removeMutation = trpc.alerts.remove.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
    },
  });

  function handleCreate() {
    createMutation.mutate({
      type: formType,
      condition: {
        threshold: parseFloat(threshold) || 0,
        metric,
        direction,
      },
      channels: channels as ('email' | 'push' | 'in_app')[],
    });
  }

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function getTypeBadgeColor(type: string) {
    switch (type) {
      case 'KEYWORD_SPIKE': return 'bg-purple-100 text-purple-700';
      case 'KEYWORD_TREND_CHANGE': return 'bg-blue-100 text-blue-700';
      case 'ENGAGEMENT_MILESTONE': return 'bg-green-100 text-green-700';
      case 'FOLLOWER_MILESTONE': return 'bg-amber-100 text-amber-700';
      case 'COMPETITOR_POST': return 'bg-red-100 text-red-700';
      case 'MENTION_ALERT': return 'bg-pink-100 text-pink-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
          <p className="text-slate-500 mt-1">
            Configure notifications for important events.
          </p>
        </div>
        {isConnected && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 transition-colors"
          >
            {showForm ? 'Cancel' : 'Create Alert'}
          </button>
        )}
      </div>

      {!isConnected && (
        <ConnectPrompt description="Connect your Threads account to set up alerts." />
      )}

      {/* Create Alert Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">New Alert</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Alert Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as AlertTypeValue)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            >
              {ALERT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {ALERT_TYPES.find((t) => t.value === formType)?.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Metric</label>
              <input
                type="text"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="e.g. postCount, likes"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Threshold</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'above' | 'below')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              >
                <option value="above">Above threshold</option>
                <option value="below">Below threshold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Channels</label>
            <div className="flex gap-3">
              {(['in_app', 'email', 'push'] as const).map((ch) => (
                <label key={ch} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-700 capitalize">{ch.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-danger-500">{createMutation.error.message}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || channels.length === 0}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      )}

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(alert.type)}`}>
                  {alert.type.replace(/_/g, ' ')}
                </span>
                <div>
                  <p className="text-sm text-slate-700">
                    {alert.condition.metric} {alert.condition.direction} {alert.condition.threshold}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Triggered {alert.triggerCount} time{alert.triggerCount !== 1 ? 's' : ''}
                    {alert.lastTriggered && ` · Last: ${new Date(alert.lastTriggered).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleMutation.mutate({ id: alert.id, isActive: !alert.isActive })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    alert.isActive ? 'bg-brand-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      alert.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <button
                  onClick={() => removeMutation.mutate({ id: alert.id })}
                  className="text-slate-400 hover:text-danger-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : isConnected ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No alerts configured</h2>
            <p className="text-sm text-slate-500">
              Create your first alert to get notified about important changes.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
