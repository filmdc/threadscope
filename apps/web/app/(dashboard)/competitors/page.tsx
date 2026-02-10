'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useConnectionStatus } from '@/lib/hooks/use-connection-status';
import { ConnectPrompt } from '@/components/connect-prompt';
import { CreatorAvatar, EngagementRate, MetricCard } from '@threadscope/ui';
import { abbreviateNumber } from '@threadscope/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function CompetitorsPage() {
  const [username, setUsername] = useState('');
  const { data: connectionStatus } = useConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;

  const utils = trpc.useUtils();

  const { data: competitors, isLoading } =
    trpc.competitors.list.useQuery();

  const addMutation = trpc.competitors.add.useMutation({
    onSuccess: () => {
      setUsername('');
      utils.competitors.list.invalidate();
      utils.competitors.benchmark.invalidate();
    },
  });

  const removeMutation = trpc.competitors.remove.useMutation({
    onSuccess: () => {
      utils.competitors.list.invalidate();
      utils.competitors.benchmark.invalidate();
    },
  });

  const { data: benchmark } = trpc.competitors.benchmark.useQuery(undefined, {
    enabled: isConnected && !!competitors && competitors.length > 0,
  });

  function handleAdd() {
    const trimmed = username.trim().replace(/^@/, '');
    if (trimmed) {
      addMutation.mutate({ username: trimmed });
    }
  }

  // Build chart data from benchmark
  const chartData =
    benchmark && competitors
      ? [
          {
            name: 'You',
            avgLikes: Math.round(benchmark.you.avgLikes),
            avgReplies: Math.round(benchmark.you.avgReplies),
            avgReposts: Math.round(benchmark.you.avgReposts),
          },
          ...benchmark.competitors.map((c) => {
            const comp = competitors.find((cc) => cc.id === c.competitorId);
            return {
              name: `@${comp?.username ?? c.username ?? 'competitor'}`,
              avgLikes: Math.round(c.metrics.avgLikes),
              avgReplies: Math.round(c.metrics.avgReplies),
              avgReposts: Math.round(c.metrics.avgReposts),
            };
          }),
        ]
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Competitors</h1>
        <p className="text-slate-500 mt-1">
          Monitor competitor accounts to benchmark your performance.
        </p>
      </div>

      {/* Add competitor */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Add a competitor
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="username"
              className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>
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

      {/* Competitor list */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white rounded-xl border border-slate-200"
            />
          ))}
        </div>
      ) : competitors && competitors.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                {comp.profilePictureUrl ? (
                  <CreatorAvatar
                    username={comp.username}
                    profilePictureUrl={comp.profilePictureUrl}
                    size="md"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      @{comp.username}
                    </span>
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
                  <span>
                    {abbreviateNumber(comp.avgLikes)} avg likes
                  </span>
                  <EngagementRate
                    rate={comp.avgEngagement * 100}
                    size="sm"
                  />
                </div>
              </div>
              <button
                onClick={() => removeMutation.mutate({ id: comp.id })}
                className="text-sm text-slate-400 hover:text-danger-500 transition-colors"
              >
                Remove
              </button>
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
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Add competitors to monitor
            </h2>
            <p className="text-sm text-slate-500">
              Enter Threads usernames above to track competitor accounts.
              Compare engagement, growth, and content strategy.
            </p>
          </div>
        </div>
      )}

      {/* Benchmark chart */}
      {!isConnected && competitors && competitors.length > 0 && (
        <ConnectPrompt
          title="Connect to see benchmark comparison"
          description="Link your Threads account to compare your performance against competitors."
        />
      )}

      {chartData.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Benchmark Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
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
              <Legend />
              <Bar
                dataKey="avgLikes"
                fill="#0095F6"
                name="Avg Likes"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="avgReplies"
                fill="#16a34a"
                name="Avg Replies"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="avgReposts"
                fill="#d97706"
                name="Avg Reposts"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
