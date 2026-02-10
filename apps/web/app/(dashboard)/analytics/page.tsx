'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useConnectionStatus } from '@/lib/hooks/use-connection-status';
import { ConnectPrompt } from '@/components/connect-prompt';
import { LoadingSkeleton, ChartSkeleton } from '@/components/loading-skeleton';
import { DateRangePicker } from '@/components/date-range-picker';
import { MetricCard, EngagementRate, MediaTypeBadge, TimeAgo } from '@threadscope/ui';
import { abbreviateNumber, formatEngagementRate } from '@threadscope/shared';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const { data: connectionStatus, isLoading: isLoadingConnection } =
    useConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;

  const { data: overview, isLoading: isLoadingOverview } =
    trpc.analytics.overview.useQuery({ days }, { enabled: isConnected });

  const { data: timeSeries, isLoading: isLoadingTimeSeries } =
    trpc.analytics.engagementTimeSeries.useQuery(
      { days },
      { enabled: isConnected },
    );

  const { data: formatBreakdown, isLoading: isLoadingFormats } =
    trpc.analytics.formatBreakdown.useQuery(
      { days },
      { enabled: isConnected },
    );

  const { data: postData, isLoading: isLoadingPosts } =
    trpc.analytics.postPerformance.useQuery(
      { days, limit: 10, sortBy: 'publishedAt', sortOrder: 'desc' },
      { enabled: isConnected },
    );

  if (isLoadingConnection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        </div>
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">
            Track your Threads performance over time.
          </p>
        </div>
        <ConnectPrompt
          title="Connect your Threads account to view analytics"
          description="Get detailed insights into your post performance, engagement rates, follower growth, and more."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">
            Track your Threads performance over time.
          </p>
        </div>
        <DateRangePicker value={days} onChange={setDays} />
      </div>

      {/* Overview metrics */}
      {isLoadingOverview ? (
        <LoadingSkeleton count={4} />
      ) : overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            value={abbreviateNumber(overview.views)}
            label="Views"
            change={overview.changes.views}
            changeLabel="vs prev period"
          />
          <MetricCard
            value={abbreviateNumber(overview.likes)}
            label="Likes"
            change={overview.changes.likes}
            changeLabel="vs prev period"
          />
          <MetricCard
            value={abbreviateNumber(overview.replies)}
            label="Replies"
            change={overview.changes.replies}
            changeLabel="vs prev period"
          />
          <MetricCard
            value={formatEngagementRate(overview.engagementRate)}
            label="Engagement Rate"
            change={overview.changes.engagementRate}
            changeLabel="vs prev period"
          />
        </div>
      ) : null}

      {/* Engagement time series chart */}
      {isLoadingTimeSeries ? (
        <ChartSkeleton />
      ) : timeSeries && timeSeries.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Engagement Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0095F6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#0095F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#0095F6"
                fill="url(#colorViews)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="likes"
                stroke="#16a34a"
                fill="url(#colorLikes)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Post performance table */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Post Performance
          </h3>
          {isLoadingPosts ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded" />
              ))}
            </div>
          ) : postData?.posts && postData.posts.length > 0 ? (
            <div className="space-y-2">
              {postData.posts.map((post) => (
                <a
                  key={post.id}
                  href={post.permalink?.startsWith('https://www.threads.net/') ? post.permalink : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 truncate">
                      {post.text || 'Media post'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <MediaTypeBadge mediaType={post.mediaType as 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'} />
                      <TimeAgo date={post.publishedAt} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <EngagementRate rate={post.engagementRate * 100} size="sm" />
                    <p className="text-xs text-slate-400 mt-0.5">
                      {abbreviateNumber(post.views)} views
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No post data available for this period.
            </p>
          )}
        </div>

        {/* Format breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Format Breakdown
          </h3>
          {isLoadingFormats ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded" />
              ))}
            </div>
          ) : formatBreakdown && formatBreakdown.length > 0 ? (
            <div className="space-y-3">
              {formatBreakdown.map((fmt) => (
                <div
                  key={fmt.mediaType}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <MediaTypeBadge mediaType={fmt.mediaType as 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'} />
                    <span className="text-sm text-slate-600">
                      {fmt.postCount} posts
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {abbreviateNumber(fmt.avgViews)} avg views
                    </p>
                    <p className="text-xs text-slate-400">
                      {(fmt.avgEngagement * 100).toFixed(2)}% avg eng.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No format data available for this period.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
