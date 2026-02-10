'use client';

import { useState } from 'react';

const reportTypes = [
  {
    id: 'engagement',
    name: 'Engagement Report',
    description: 'Likes, replies, reposts, and engagement rates over time.',
  },
  {
    id: 'growth',
    name: 'Growth Report',
    description: 'Follower growth, reach, and audience demographics.',
  },
  {
    id: 'content',
    name: 'Content Performance',
    description: 'Best and worst performing posts with insights.',
  },
  {
    id: 'competitor',
    name: 'Competitor Analysis',
    description: 'Head-to-head comparison with monitored competitors.',
  },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">
          Generate detailed reports for your Threads account.
        </p>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`text-left bg-white rounded-xl border p-5 transition-colors ${
              selectedType === type.id
                ? 'border-brand-500 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <h3 className="text-sm font-semibold text-slate-900">{type.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{type.description}</p>
          </button>
        ))}
      </div>

      {/* Generate button */}
      {selectedType && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {reportTypes.find((t) => t.id === selectedType)?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Connect your Threads account to generate this report.
              </p>
            </div>
            <button
              className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 transition-colors opacity-50 cursor-not-allowed"
              disabled
            >
              Generate Report
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedType && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Select a report type</h2>
            <p className="text-sm text-slate-500">
              Choose a report type above to get started. Reports are generated based on your Threads data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
