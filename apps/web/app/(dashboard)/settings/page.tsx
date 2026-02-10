'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

const settingsSections = [
  {
    title: 'Connections',
    description: 'Connect and manage your Threads account.',
    href: '/settings/connections',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.529a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.24 8.88" />
      </svg>
    ),
  },
  {
    title: 'API Keys',
    description: 'Generate and manage API keys for integrations.',
    href: '/settings/api-keys',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    title: 'Notifications',
    description: 'Configure email and push notification preferences.',
    href: '/alerts',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery();
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setEmail(profile.email);
    }
  }, [profile]);

  const updateMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      utils.settings.getProfile.invalidate();
    },
  });

  const deleteMutation = trpc.settings.deleteAccount.useMutation({
    onSuccess: () => {
      window.location.href = '/';
    },
  });

  function handleSave() {
    updateMutation.mutate({
      ...(name !== (profile?.name ?? '') && { name }),
      ...(email !== profile?.email && { email }),
    });
  }

  function handleDelete() {
    deleteMutation.mutate({ confirmEmail });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your account and application preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors mb-4">
              {section.icon}
            </div>
            <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{section.description}</p>
          </Link>
        ))}
      </div>

      {/* Account section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Account Details</h2>
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-lg" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            {profile && (
              <p className="text-xs text-slate-400">
                Plan: {profile.plan} · Member since {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            )}
            {updateMutation.isError && (
              <p className="text-sm text-danger-500">{updateMutation.error.message}</p>
            )}
            {updateMutation.isSuccess && (
              <p className="text-sm text-success-600">Profile updated successfully.</p>
            )}
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-danger-200 p-6">
        <h2 className="text-lg font-semibold text-danger-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4">
          Permanently delete your account and all associated data.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-white border border-danger-300 text-danger-600 rounded-lg font-medium text-sm hover:bg-danger-50 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Type your email address <strong>{profile?.email}</strong> to confirm:
            </p>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Enter your email to confirm"
              className="w-full max-w-sm px-3.5 py-2.5 rounded-lg border border-danger-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:border-transparent text-sm"
            />
            {deleteMutation.isError && (
              <p className="text-sm text-danger-500">{deleteMutation.error.message}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending || !confirmEmail}
                className="px-4 py-2 bg-danger-600 text-white rounded-lg font-medium text-sm hover:bg-danger-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setConfirmEmail(''); }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
