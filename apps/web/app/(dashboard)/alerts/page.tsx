'use client';

import { useState } from 'react';

const alertTypes = [
  { id: 'engagement-spike', label: 'Engagement spike', description: 'Get notified when a post gets unusually high engagement.' },
  { id: 'follower-milestone', label: 'Follower milestone', description: 'Celebrate when you hit follower milestones.' },
  { id: 'mention', label: 'Mentions', description: 'Get alerted when someone mentions you.' },
  { id: 'keyword', label: 'Keyword alert', description: 'Track when specific keywords trend.' },
];

export default function AlertsPage() {
  const [enabledAlerts, setEnabledAlerts] = useState<Set<string>>(new Set());

  function toggleAlert(id: string) {
    setEnabledAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
        <p className="text-slate-500 mt-1">
          Configure notifications for important events.
        </p>
      </div>

      {/* Alert configurations */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {alertTypes.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between px-6 py-5">
            <div>
              <h3 className="text-sm font-medium text-slate-900">{alert.label}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
            </div>
            <button
              onClick={() => toggleAlert(alert.id)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                enabledAlerts.has(alert.id) ? 'bg-brand-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  enabledAlerts.has(alert.id) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Empty state info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-900">Alerts require a connected account</h3>
            <p className="text-xs text-slate-500 mt-1">
              Connect your Threads account in Settings to start receiving alerts. Toggle the alerts you want above, and they will activate once your account is connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
