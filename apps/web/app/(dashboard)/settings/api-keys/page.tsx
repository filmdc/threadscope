'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function ApiKeysPage() {
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: keys, isLoading } = trpc.settings.listApiKeys.useQuery();

  const createMutation = trpc.settings.createApiKey.useMutation({
    onSuccess: (data) => {
      setNewKey(data.key);
      setKeyName('');
      utils.settings.listApiKeys.invalidate();
    },
  });

  const deleteMutation = trpc.settings.deleteApiKey.useMutation({
    onSuccess: () => {
      setDeletingId(null);
      utils.settings.listApiKeys.invalidate();
    },
  });

  function handleCreate() {
    const trimmed = keyName.trim();
    if (trimmed) {
      createMutation.mutate({ name: trimmed });
    }
  }

  async function handleCopy() {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
        <p className="text-slate-500 mt-1">
          Manage API keys for the browser extension and third-party integrations.
        </p>
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="bg-success-50 border border-success-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-success-800">API key created successfully</p>
              <p className="text-xs text-success-700 mt-1">
                Copy this key now. It won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-xs bg-white px-3 py-2 rounded-lg border border-success-200 font-mono text-slate-800 break-all">
                  {newKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-success-600 text-white rounded-lg text-xs font-medium hover:bg-success-700 transition-colors flex-shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="text-success-400 hover:text-success-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Create API key */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Create API Key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Key name (e.g., Browser Extension)"
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !keyName.trim()}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Key'}
          </button>
        </div>
        {createMutation.isError && (
          <p className="mt-2 text-sm text-danger-500">{createMutation.error.message}</p>
        )}
      </div>

      {/* Key list */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : keys && keys.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Your API Keys</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {keys.map((key) => (
              <div key={key.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{key.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <code className="text-xs text-slate-500 font-mono">{key.keyPrefix}...{'*'.repeat(20)}</code>
                    <span className="text-xs text-slate-400">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    {key.lastUsedAt && (
                      <span className="text-xs text-slate-400">
                        Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {deletingId === key.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Delete?</span>
                      <button
                        onClick={() => deleteMutation.mutate({ id: key.id })}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-1 text-xs font-medium text-danger-600 bg-danger-50 rounded-lg hover:bg-danger-100 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(key.id)}
                      className="text-slate-400 hover:text-danger-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No API keys</h2>
            <p className="text-sm text-slate-500">
              Create an API key to use with the ThreadScope browser extension or other integrations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
