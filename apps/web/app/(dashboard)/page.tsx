'use client';

import { trpc } from '@/lib/trpc';
import { useConnectionStatus } from '@/lib/hooks/use-connection-status';
import { ConnectPrompt } from '@/components/connect-prompt';
import {
  LoadingSkeleton,
  PostPreviewSkeleton,
} from '@/components/loading-skeleton';
import { MetricCard } from '@threadscope/ui';
import { PostPreview } from '@threadscope/ui';
import { TrendDirection } from '@threadscope/ui';
import { abbreviateNumber } from '@threadscope/shared';

export default function DashboardPage() {
  const { data: connectionStatus, isLoading: isLoadingConnection } =
    useConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;

  const { data: overview, isLoading: isLoadingOverview } =
    trpc.dashboard.overview.useQuery(undefined, { enabled: isConnected });

  const { data: recentPosts, isLoading: isLoadingPosts } =
    trpc.dashboard.recentPosts.useQuery(undefined, { enabled: isConnected });

  const { data: trending, isLoading: isLoadingTrending } =
    trpc.dashboard.trendingSummary.useQuery();

  if (isLoadingConnection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to ThreadScope
          </h1>
          <p className="text-slate-500 mt-1">
            Your Threads intelligence dashboard.
          </p>
        </div>
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isConnected
            ? `Welcome back, @${connectionStatus?.username}`
            : 'Welcome to ThreadScope'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isConnected
            ? "Here's how your Threads account is performing."
            : 'Your Threads intelligence dashboard. Connect your account to get started.'}
        </p>
      </div>

      {/* Connect CTA */}
      {!isConnected && <ConnectPrompt />}

      {/* Metric cards */}
      {isLoadingOverview && isConnected ? (
        <LoadingSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            value={overview ? abbreviateNumber(overview.views) : '\u2014'}
            label="Views"
          />
          <MetricCard
            value={overview ? abbreviateNumber(overview.likes) : '\u2014'}
            label="Likes"
          />
          <MetricCard
            value={overview ? abbreviateNumber(overview.replies) : '\u2014'}
            label="Replies"
          />
          <MetricCard
            value={
              overview
                ? abbreviateNumber(overview.followersCount)
                : '\u2014'
            }
            label="Followers"
            change={overview?.followerGrowth}
            changeLabel="this period"
          />
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Recent Posts
          </h3>
          {isLoadingPosts && isConnected ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <PostPreviewSkeleton key={i} />
              ))}
            </div>
          ) : recentPosts && recentPosts.length > 0 ? (
            <div className="space-y-3">
              {recentPosts.map((post) => (
                <PostPreview
                  key={post.id}
                  text={post.text}
                  mediaType={post.mediaType as 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'}
                  likes={post.likes}
                  replies={post.replies}
                  reposts={post.reposts}
                  permalink={post.permalink}
                  username={connectionStatus?.username ?? ''}
                  publishedAt={post.publishedAt}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No posts yet</p>
              <p className="text-xs text-slate-400 mt-1">
                {isConnected
                  ? 'Your post data will appear here once synced.'
                  : 'Connect your Threads account to see your recent posts.'}
              </p>
            </div>
          )}
        </div>

        {/* Trending Keywords */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Trending Keywords
          </h3>
          {isLoadingTrending ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded" />
              ))}
            </div>
          ) : trending && trending.length > 0 ? (
            <div className="space-y-3">
              {trending.map((kw) => (
                <div
                  key={kw.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {kw.keyword}
                    </span>
                    <span className="text-xs text-slate-400">
                      {kw.latestPostCount} posts
                    </span>
                  </div>
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
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-slate-400"
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
              <p className="text-sm text-slate-500">No trending data</p>
              <p className="text-xs text-slate-400 mt-1">
                Track keywords to discover what&apos;s trending.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
