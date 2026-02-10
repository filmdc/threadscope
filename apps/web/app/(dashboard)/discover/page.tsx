'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useConnectionStatus } from '@/lib/hooks/use-connection-status';
import {
  PostPreview,
  CreatorAvatar,
  EngagementRate,
  VerifiedBadge,
} from '@threadscope/ui';

type Tab = 'posts' | 'creators';

export default function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const { data: connectionStatus } = useConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;

  const { data: postsResult, isLoading: isLoadingPosts } =
    trpc.discover.searchPosts.useQuery(
      { query: searchQuery },
      { enabled: !!searchQuery && isConnected && activeTab === 'posts' },
    );

  const { data: creatorsResult, isLoading: isLoadingCreators } =
    trpc.discover.searchCreators.useQuery(
      { keyword: searchQuery, sortBy: 'avgEngagement' },
      { enabled: !!searchQuery && activeTab === 'creators' },
    );

  const trackMutation = trpc.discover.trackCreator.useMutation();

  function handleSearch() {
    const trimmed = query.trim();
    if (trimmed) {
      setSearchQuery(trimmed);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Discover</h1>
        <p className="text-slate-500 mt-1">
          Find and explore Threads creators, topics, and conversations.
        </p>
      </div>

      {/* Search input */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for creators, topics, or keywords..."
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Tabs */}
        {searchQuery && (
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('creators')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'creators'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Creators
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {searchQuery ? (
        activeTab === 'posts' ? (
          // Posts tab
          <div>
            {!isConnected ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-500">
                  Connect your Threads account to search posts.
                </p>
              </div>
            ) : isLoadingPosts ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-white rounded-xl border border-slate-200"
                  />
                ))}
              </div>
            ) : postsResult?.posts && postsResult.posts.length > 0 ? (
              <div className="space-y-3">
                {postsResult.posts.map((post) => (
                  <PostPreview
                    key={post.id}
                    text={post.text}
                    mediaType={
                      post.mediaType as
                        | 'TEXT'
                        | 'IMAGE'
                        | 'VIDEO'
                        | 'CAROUSEL'
                    }
                    likes={post.likes}
                    replies={post.replies}
                    reposts={post.reposts}
                    permalink={post.permalink}
                    username={post.username}
                    publishedAt={post.publishedAt}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-sm text-slate-500">
                  No posts found for &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
          </div>
        ) : (
          // Creators tab
          <div>
            {isLoadingCreators ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-white rounded-xl border border-slate-200"
                  />
                ))}
              </div>
            ) : creatorsResult?.creators &&
              creatorsResult.creators.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {creatorsResult.creators.map((creator) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <CreatorAvatar
                        username={creator.username}
                        profilePictureUrl={creator.profilePictureUrl}
                        isVerified={creator.isVerified}
                        size="md"
                      />
                      <div>
                        <p className="text-xs text-slate-400">
                          {creator.observedPostCount} posts observed
                        </p>
                        <EngagementRate
                          rate={creator.avgEngagement * 100}
                          size="sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        trackMutation.mutate({ creatorId: creator.id })
                      }
                      disabled={trackMutation.isPending}
                      className="px-4 py-1.5 text-sm font-medium text-brand-500 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      Track
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-sm text-slate-500">
                  No creators found for &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
          </div>
        )
      ) : (
        // Empty state
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
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Search Threads creators
            </h2>
            <p className="text-sm text-slate-500">
              Enter a name, username, or topic to discover creators and
              conversations on Threads.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
