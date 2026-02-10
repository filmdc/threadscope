'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    const code = searchParams.get('code');
    const connected = searchParams.get('connected');

    if (error) {
      setStatus('error');
      setErrorMessage(
        error === 'oauth_failed'
          ? 'Failed to connect your Threads account. Please try again.'
          : 'Authentication error. Please try again.'
      );
      return;
    }

    // If redirected back from API with connected=true, go to connections page
    if (connected === 'true') {
      router.push('/settings/connections?connected=true');
      return;
    }

    if (code) {
      // Exchange code for tokens via the API (server-side handles token storage)
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      fetch(`${API_URL}/auth/threads/callback?code=${encodeURIComponent(code)}`, {
        method: 'GET',
        credentials: 'include',
      })
        .then((res) => {
          if (res.redirected) {
            // The API redirects to connections page on success
            window.location.href = res.url;
            return;
          }
          return res.json();
        })
        .then((data) => {
          if (data?.success) {
            router.push('/settings/connections?connected=true');
          } else if (data) {
            setStatus('error');
            setErrorMessage('Failed to complete authentication.');
          }
        })
        .catch(() => {
          setStatus('error');
          setErrorMessage('Network error during authentication.');
        });
      return;
    }

    // No recognized params - redirect to dashboard after a short delay
    const timeout = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router, searchParams]);

  if (status === 'error') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger-50 mb-4">
          <svg className="w-6 h-6 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Connection Failed</h2>
        <p className="text-sm text-slate-500 mb-6">{errorMessage}</p>
        <button
          onClick={() => router.push('/settings/connections')}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 mb-4">
        <svg
          className="w-6 h-6 text-brand-500 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900 mb-2">
        Connecting your Threads account...
      </h2>
      <p className="text-sm text-slate-500">
        Please wait while we complete the connection.
      </p>
    </div>
  );
}
