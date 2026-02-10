'use client';

export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
      <div className="h-8 w-24 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-20 bg-slate-100 rounded" />
    </div>
  );
}

export function PostPreviewSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-4 w-20 bg-slate-200 rounded" />
        <div className="h-5 w-12 bg-slate-100 rounded-full" />
      </div>
      <div className="h-4 w-full bg-slate-100 rounded mb-2" />
      <div className="h-4 w-3/4 bg-slate-100 rounded mb-3" />
      <div className="flex gap-4">
        <div className="h-3 w-10 bg-slate-100 rounded" />
        <div className="h-3 w-10 bg-slate-100 rounded" />
        <div className="h-3 w-10 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 animate-pulse">
      <div className="h-4 flex-1 bg-slate-100 rounded" />
      <div className="h-4 w-16 bg-slate-100 rounded" />
      <div className="h-4 w-16 bg-slate-100 rounded" />
      <div className="h-4 w-16 bg-slate-100 rounded" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
      <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
      <div className="h-64 bg-slate-50 rounded flex items-end justify-around gap-2 px-4 pb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-200 rounded-t w-full"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}
