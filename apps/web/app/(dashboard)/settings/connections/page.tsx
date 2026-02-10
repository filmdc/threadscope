'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ConnectionsPage() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [connectedUsername, setConnectedUsername] = useState('');

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      setConnected(true);
      setConnectedUsername('your_threads_handle');
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
    if (searchParams.get('error') === 'oauth_failed') {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  function handleConnect() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    window.location.href = `${API_URL}/auth/threads`;
  }

  function handleDisconnect() {
    setConnected(false);
    setConnectedUsername('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
        <p className="text-slate-500 mt-1">
          Connect your social media accounts.
        </p>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-success-50 border border-success-200">
          <svg className="w-5 h-5 text-success-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-success-700 font-medium">
            Threads account connected successfully!
          </p>
        </div>
      )}

      {/* Error banner */}
      {showError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger-50 border border-danger-200">
          <svg className="w-5 h-5 text-danger-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-danger-700 font-medium">
            Failed to connect your Threads account. Please try again.
          </p>
        </div>
      )}

      {/* Threads connection card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Threads icon */}
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.433 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 2.227-.018 4.07-.556 5.479-1.6 1.55-1.147 2.324-2.758 2.324-4.347h-.002c0-1.093-.378-1.964-1.123-2.59-.7-.588-1.695-.895-2.878-.918-1.683.05-2.682.62-3.256 1.04.089.703.247 1.368.472 1.978.443 1.197 1.108 2.093 1.978 2.663.97.638 2.12.905 3.503.905l.126-.002c1.145-.04 2.098-.36 2.834-.952.683-.55 1.14-1.3 1.357-2.23l1.985.47c-.302 1.3-.943 2.372-1.903 3.145-1.024.826-2.29 1.278-3.762 1.344l-.217.004c-1.735 0-3.228-.37-4.435-1.102-1.145-.694-2.024-1.808-2.613-3.31a12.091 12.091 0 01-.62-2.592c-.971.777-1.591 1.82-1.591 3.09 0 .472.065.918.193 1.338l-1.92.633A6.166 6.166 0 017.2 15.27c0-2.193 1.227-3.834 3.16-4.87.13-.07.264-.135.4-.196a9.358 9.358 0 01-.09-1.204c0-1.632.496-3.03 1.434-4.048C13.023 3.96 14.328 3.44 15.9 3.4c1.537.042 2.743.544 3.585 1.493.785.884 1.201 2.07 1.237 3.526.016.628-.055 1.248-.21 1.847 1.075.408 1.933 1.06 2.525 1.919.71 1.03 1.07 2.273 1.07 3.695 0 2.19-1.06 4.354-3.08 5.85-1.73 1.282-3.91 1.98-6.477 2.082-.182.007-.363.01-.543.01l-.02-.001z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Threads Account</h3>
              {connected ? (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700">@{connectedUsername}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
                      Connected
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-1">
                  Connect your Threads account to unlock analytics, scheduling, and insights.
                </p>
              )}
            </div>
          </div>

          {connected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 transition-colors"
            >
              Connect Threads Account
            </button>
          )}
        </div>
      </div>

      {/* Permissions info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">What we access</h3>
        <div className="space-y-3">
          {[
            { label: 'Read your posts and replies', description: 'View your published content for analytics.' },
            { label: 'Read engagement metrics', description: 'Likes, replies, reposts, and view counts.' },
            { label: 'Read profile information', description: 'Your username, bio, and follower count.' },
            { label: 'Publish posts on your behalf', description: 'Only when you explicitly use the Compose feature.' },
          ].map((perm) => (
            <div key={perm.label} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-slate-700">{perm.label}</p>
                <p className="text-xs text-slate-400">{perm.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
