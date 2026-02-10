'use client';

import Link from 'next/link';

interface ConnectPromptProps {
  title?: string;
  description?: string;
}

export function ConnectPrompt({
  title = 'Connect your Threads account',
  description = 'Link your Threads account to unlock analytics, trends, and insights.',
}: ConnectPromptProps) {
  return (
    <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-brand-100 mt-1 text-sm">{description}</p>
        </div>
        <Link
          href="/settings/connections"
          className="px-5 py-2.5 bg-white text-brand-600 rounded-lg font-medium text-sm hover:bg-brand-50 transition-colors flex-shrink-0"
        >
          Connect Account
        </Link>
      </div>
    </div>
  );
}
