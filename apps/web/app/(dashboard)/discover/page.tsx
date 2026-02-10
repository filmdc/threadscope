'use client';

import { useState } from 'react';

export default function DiscoverPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Discover</h1>
        <p className="text-slate-500 mt-1">
          Find and explore Threads creators, topics, and conversations.
        </p>
      </div>

      {/* Search input */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for creators, topics, or keywords..."
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {query ? `No results for "${query}"` : 'Search Threads creators'}
          </h2>
          <p className="text-sm text-slate-500">
            {query
              ? 'Try a different search term or check back later.'
              : 'Enter a name, username, or topic to discover creators and conversations on Threads.'}
          </p>
        </div>
      </div>
    </div>
  );
}
