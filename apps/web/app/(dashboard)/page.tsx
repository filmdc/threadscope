import Link from 'next/link';

const metricCards = [
  { label: 'Views', value: '\u2014', change: null, icon: '👁' },
  { label: 'Likes', value: '\u2014', change: null, icon: '♥' },
  { label: 'Replies', value: '\u2014', change: null, icon: '💬' },
  { label: 'Followers', value: '\u2014', change: null, icon: '👤' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome to ThreadScope</h1>
        <p className="text-slate-500 mt-1">
          Your Threads intelligence dashboard. Connect your account to get started.
        </p>
      </div>

      {/* Connect CTA */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Connect your Threads account</h2>
            <p className="text-brand-100 mt-1 text-sm">
              Link your Threads account to unlock analytics, trends, and insights.
            </p>
          </div>
          <Link
            href="/settings/connections"
            className="px-5 py-2.5 bg-white text-brand-600 rounded-lg font-medium text-sm hover:bg-brand-50 transition-colors flex-shrink-0"
          >
            Connect Account
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <p className="text-xs text-slate-400 mt-1">Connect account to view</p>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Posts</h3>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No posts yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Connect your Threads account to see your recent posts
            </p>
          </div>
        </div>

        {/* Trending Keywords */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Trending Keywords</h3>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No trending data</p>
            <p className="text-xs text-slate-400 mt-1">
              Track keywords to discover what&apos;s trending
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
