'use client';

import { useState } from 'react';

export default function TrendsPage() {
  const [keyword, setKeyword] = useState('');
  const [trackedKeywords, setTrackedKeywords] = useState<string[]>([]);

  function addKeyword() {
    const trimmed = keyword.trim();
    if (trimmed && !trackedKeywords.includes(trimmed)) {
      setTrackedKeywords([...trackedKeywords, trimmed]);
      setKeyword('');
    }
  }

  function removeKeyword(kw: string) {
    setTrackedKeywords(trackedKeywords.filter((k) => k !== kw));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trends</h1>
        <p className="text-slate-500 mt-1">
          Track keywords to see what&apos;s trending on Threads.
        </p>
      </div>

      {/* Keyword input */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Track a keyword</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Enter a keyword or hashtag..."
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
          <button
            onClick={addKeyword}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 transition-colors"
          >
            Add
          </button>
        </div>

        {/* Tracked keywords */}
        {trackedKeywords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {trackedKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm"
              >
                {kw}
                <button
                  onClick={() => removeKeyword(kw)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {trackedKeywords.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No keywords tracked yet</h2>
            <p className="text-sm text-slate-500">
              Add keywords above to start tracking trends. You&apos;ll see volume, sentiment, and related discussions.
            </p>
          </div>
        </div>
      )}

      {/* Placeholder for tracked keyword results */}
      {trackedKeywords.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Collecting trend data</h2>
            <p className="text-sm text-slate-500">
              Connect your Threads account to see trend data for your tracked keywords.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
