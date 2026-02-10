'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { TrendDirection, PostPreview, MetricCard } from '@threadscope/ui';
import { abbreviateNumber } from '@threadscope/shared';

export default function TrendsPage() {
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: keywords, isLoading } = trpc.trends.list.useQuery();

  const addMutation = trpc.trends.add.useMutation({
    onSuccess: () => {
      setKeyword('');
      utils.trends.list.invalidate();
    },
  });

  const removeMutation = trpc.trends.remove.useMutation({
    onSuccess: () => {
      utils.trends.list.invalidate();
    },
  });

  const { data: detail } = trpc.trends.detail.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );

  function handleAdd() {
    const trimmed = keyword.trim();
    if (trimmed) {
      addMutation.mutate({ keyword: trimmed });
    }
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
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Track a keyword
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Enter a keyword or hashtag..."
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {addMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
        {addMutation.isError && (
          <p className="mt-2 text-sm text-danger-500">
            {addMutation.error.message}
          </p>
        )}
      </div>

      {/* Tracked keywords list */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white rounded-xl border border-slate-200"
            />
          ))}
        </div>
      ) : keywords && keywords.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {keywords.map((kw) => (
            <div
              key={kw.id}
              className={`flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                selectedId === kw.id ? 'bg-brand-50' : ''
              }`}
              onClick={() =>
                setSelectedId(selectedId === kw.id ? null : kw.id)
              }
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-900">
                  {kw.keyword}
                </span>
                <TrendDirection
                  value={
                    kw.trend === 'rising'
                      ? 5
                      : kw.trend === 'falling'
                      ? -5
                      : 0
                  }
                  size="sm"
                />
                {/* Sparkline */}
                {kw.sparkline.length > 1 && (
                  <svg
                    width="60"
                    height="20"
                    viewBox={`0 0 ${kw.sparkline.length - 1} ${Math.max(...kw.sparkline, 1)}`}
                    preserveAspectRatio="none"
                    style={{ overflow: 'visible' }}
                  >
                    <polyline
                      fill="none"
                      stroke={
                        kw.trend === 'rising'
                          ? '#16a34a'
                          : kw.trend === 'falling'
                          ? '#dc2626'
                          : '#94a3b8'
                      }
                      strokeWidth={Math.max(...kw.sparkline, 1) * 0.1}
                      points={kw.sparkline
                        .map(
                          (v, i) =>
                            `${i},${Math.max(...kw.sparkline, 1) - v}`,
                        )
                        .join(' ')}
                    />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400">
                  {kw.latestPostCount} posts
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate({ id: kw.id });
                  }}
                  className="text-slate-400 hover:text-danger-500 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              No keywords tracked yet
            </h2>
            <p className="text-sm text-slate-500">
              Add keywords above to start tracking trends. You&apos;ll see
              volume and related discussions.
            </p>
          </div>
        </div>
      )}

      {/* Keyword detail panel */}
      {selectedId && detail && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Details: {detail.keyword}
          </h3>

          {/* Summary metrics */}
          {detail.timeSeries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                value={abbreviateNumber(
                  detail.timeSeries[detail.timeSeries.length - 1]?.postCount ??
                    0,
                )}
                label="Latest Post Count"
              />
              <MetricCard
                value={`${((detail.timeSeries[detail.timeSeries.length - 1]?.avgEngagement ?? 0) * 100).toFixed(2)}%`}
                label="Latest Avg Engagement"
              />
              <MetricCard
                value={String(detail.timeSeries.length)}
                label="Days Tracked"
              />
            </div>
          )}

          {/* Top posts */}
          {detail.topPosts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Top Posts
              </h4>
              <div className="space-y-3">
                {detail.topPosts.slice(0, 5).map((post) => (
                  <PostPreview
                    key={post.threadsMediaId}
                    text={post.text}
                    mediaType="TEXT"
                    likes={post.likes}
                    replies={post.replies}
                    reposts={post.reposts}
                    permalink={post.permalink}
                    username={post.username}
                    publishedAt={post.publishedAt}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top creators */}
          {detail.topCreators.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Top Creators
              </h4>
              <div className="space-y-2">
                {detail.topCreators.map((c) => (
                  <div
                    key={c.username}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      @{c.username}
                    </span>
                    <span className="text-xs text-slate-400">
                      {c.postCount} posts, {abbreviateNumber(c.totalLikes)}{' '}
                      likes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
