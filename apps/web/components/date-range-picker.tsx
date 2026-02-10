'use client';

const ranges = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

interface DateRangePickerProps {
  value: number;
  onChange: (days: number) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {ranges.map((r) => (
        <button
          key={r.days}
          onClick={() => onChange(r.days)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === r.days
              ? 'bg-brand-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
