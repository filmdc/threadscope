'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useConnectionStatus } from '@/lib/hooks/use-connection-status';
import { ConnectPrompt } from '@/components/connect-prompt';

const REPORT_TYPES = [
  { value: 'ACCOUNT_PERFORMANCE', name: 'Account Performance', description: 'Overall account metrics and growth over time.' },
  { value: 'POST_PERFORMANCE', name: 'Post Performance', description: 'Best and worst performing posts with insights.' },
  { value: 'KEYWORD_TREND', name: 'Keyword Trend', description: 'Keyword volume and engagement trends.' },
  { value: 'CREATOR_DISCOVERY', name: 'Creator Discovery', description: 'Discovered creators and their engagement patterns.' },
  { value: 'COMPETITOR_BENCHMARK', name: 'Competitor Benchmark', description: 'Head-to-head comparison with tracked competitors.' },
  { value: 'CONTENT_ANALYSIS', name: 'Content Analysis', description: 'Content format and topic performance analysis.' },
  { value: 'AUDIENCE_INSIGHTS', name: 'Audience Insights', description: 'Follower demographics and behavior patterns.' },
  { value: 'TOPIC_LANDSCAPE', name: 'Topic Landscape', description: 'Overview of trending topics in your niche.' },
] as const;

type ReportTypeValue = typeof REPORT_TYPES[number]['value'];

function statusBadge(status: string) {
  switch (status) {
    case 'queued': return 'bg-slate-100 text-slate-700';
    case 'processing': return 'bg-blue-100 text-blue-700';
    case 'completed': return 'bg-green-100 text-green-700';
    case 'failed': return 'bg-red-100 text-red-700';
    case 'cancelled': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export default function ReportsPage() {
  const { data: connectionStatus } = useConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;

  const [selectedType, setSelectedType] = useState<ReportTypeValue | null>(null);
  const [days, setDays] = useState('30');
  const [viewingId, setViewingId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: reports, isLoading } = trpc.reports.list.useQuery(undefined, {
    enabled: isConnected,
  });

  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: () => {
      setSelectedType(null);
      utils.reports.list.invalidate();
    },
  });

  const exportMutation = trpc.reports.export.useMutation();

  const { data: reportDetail } = trpc.reports.get.useQuery(
    { id: viewingId! },
    { enabled: !!viewingId },
  );

  function handleGenerate() {
    if (!selectedType) return;
    generateMutation.mutate({
      type: selectedType,
      parameters: {
        days: parseInt(days) || 30,
      },
    });
  }

  function handleExport(reportId: string, format: 'CSV' | 'JSON') {
    exportMutation.mutate(
      { reportId, format },
      {
        onSuccess: (data) => {
          // Download as file
          const blob = new Blob([data.data], {
            type: format === 'JSON' ? 'application/json' : 'text/csv',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename;
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">
          Generate detailed reports for your Threads account.
        </p>
      </div>

      {!isConnected && (
        <ConnectPrompt description="Connect your Threads account to generate reports." />
      )}

      {/* Report type selector */}
      {isConnected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(selectedType === type.value ? null : type.value)}
              className={`text-left bg-white rounded-xl border p-5 transition-colors ${
                selectedType === type.value
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <h3 className="text-sm font-semibold text-slate-900">{type.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{type.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Generate form */}
      {selectedType && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1 mr-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {REPORT_TYPES.find((t) => t.value === selectedType)?.name}
              </h3>
              <div className="flex gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Time Range (days)</label>
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    min={1}
                    max={365}
                    className="w-24 px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>
              {generateMutation.isError && (
                <p className="text-sm text-danger-500">{generateMutation.error.message}</p>
              )}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      )}

      {/* Report history table */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Report History</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <div key={report.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(report.status)}`}>
                    {report.status}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{report.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(report.createdAt).toLocaleDateString()}
                      {report.resultCount != null && ` · ${report.resultCount} items`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {report.status === 'completed' && (
                    <>
                      <button
                        onClick={() => setViewingId(viewingId === report.id ? null : report.id)}
                        className="px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        {viewingId === report.id ? 'Hide' : 'View'}
                      </button>
                      <button
                        onClick={() => handleExport(report.id, 'CSV')}
                        disabled={exportMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => handleExport(report.id, 'JSON')}
                        disabled={exportMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        JSON
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isConnected ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No reports yet</h2>
            <p className="text-sm text-slate-500">
              Select a report type above to generate your first report.
            </p>
          </div>
        </div>
      ) : null}

      {/* Report detail view */}
      {viewingId && reportDetail && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">{reportDetail.name}</h3>
          {reportDetail.resultSummary && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Summary</h4>
              <pre className="text-sm text-slate-700 bg-slate-50 rounded-lg p-4 overflow-auto max-h-64">
                {JSON.stringify(reportDetail.resultSummary, null, 2)}
              </pre>
            </div>
          )}
          {reportDetail.resultCount != null && (
            <p className="text-sm text-slate-500">
              {reportDetail.resultCount} items
              {reportDetail.processingTime && ` · Processed in ${reportDetail.processingTime}ms`}
            </p>
          )}
          {exportMutation.isError && (
            <p className="mt-2 text-sm text-danger-500">{exportMutation.error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
