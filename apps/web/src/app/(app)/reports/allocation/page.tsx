'use client';

import { useAllocation } from '@/lib/hooks/use-reports';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';

export default function AllocationReportPage() {
  const { data, isLoading } = useAllocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg-primary mb-1">Allocation Report</h1>
        <p className="text-fg-secondary text-sm">See how your wealth is distributed.</p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-fg-secondary mb-2">Total Net Worth</p>
            <h2 className="text-4xl font-semibold text-fg-primary">
              <AmountDisplay value={data.total} currency="KES" />
            </h2>
          </div>

          <div className="space-y-4">
            {Object.entries(data.breakdown).map(([key, value]) => {
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              const numValue = Number(value);
              const percent =
                Number(data.total) === 0 ? 0 : Math.round((numValue / Number(data.total)) * 100);

              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-fg-primary capitalize">{label}</span>
                    <span className="text-fg-secondary font-mono">
                      <AmountDisplay value={value} currency="KES" /> ({percent}%)
                    </span>
                  </div>
                  {/* Progress bar for allocation */}
                  <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-accent-primary" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
