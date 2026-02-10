'use client';

import { useState } from 'react';

const MAX_CHARS = 500;

export default function ComposePage() {
  const [text, setText] = useState('');
  const [publishing, setPublishing] = useState(false);

  const charsRemaining = MAX_CHARS - text.length;
  const isOverLimit = charsRemaining < 0;

  function handlePublish() {
    if (!text.trim() || isOverLimit) return;
    setPublishing(true);
    // Placeholder - will connect to API
    setTimeout(() => {
      setPublishing(false);
      alert('Publishing requires a connected Threads account.');
    }, 500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compose</h1>
        <p className="text-slate-500 mt-1">
          Draft and publish posts to Threads.
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* Author row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Your Account</p>
              <p className="text-xs text-slate-400">Draft</p>
            </div>
          </div>

          {/* Text area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            className="w-full px-0 py-2 border-0 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 resize-none text-sm leading-relaxed"
          />

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-4">
              {/* Character count */}
              <span
                className={`text-sm font-medium ${
                  isOverLimit
                    ? 'text-danger-500'
                    : charsRemaining <= 50
                    ? 'text-warning-500'
                    : 'text-slate-400'
                }`}
              >
                {charsRemaining}
              </span>

              {/* Progress ring */}
              <svg className="w-5 h-5" viewBox="0 0 20 20">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke={isOverLimit ? '#ef4444' : charsRemaining <= 50 ? '#f59e0b' : '#0095F6'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(1, text.length / MAX_CHARS) * 50.27} 50.27`}
                  transform="rotate(-90 10 10)"
                />
              </svg>
            </div>

            <button
              onClick={handlePublish}
              disabled={!text.trim() || isOverLimit || publishing}
              className="px-5 py-2 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
