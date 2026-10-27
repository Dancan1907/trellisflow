'use client';

import { useNetWorthTrend } from '@/lib/hooks/use-reports';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api/api-client';
import { useAuthStore } from '@/lib/auth/auth-store';

export default function NetWorthReportPage() {
  const { data: trend, isLoading } = useNetWorthTrend(90); // Last 90 days
  const token = useAuthStore((state) => state.token);

  const handleDownloadPdf = () => {
    // We pass the token via query param because opening a new window
    // doesn't send the Authorization header. In a real app, you'd use
    // a short-lived signed URL, but this works for MVP.
    const url = `${API_BASE_URL}/api/reports/net-worth/pdf?token=${token}`;
    window.open(url, '_blank');
  };

  const latest = trend && trend.length > 0 ? trend[trend.length - 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Net Worth Statement</h1>
          <p className="text-fg-secondary text-sm">Your wealth trajectory over the last 90 days.</p>
        </div>
        <button
          onClick={handleDownloadPdf}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-border-subtle text-fg-primary text-sm font-medium hover:bg-bg-tertiary transition-colors"
        >
          <FileDown size={16} /> Download PDF
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-8">
          {latest ? (
            <div className="mb-8">
              <p className="text-sm font-medium text-fg-secondary mb-2">Current Net Worth</p>
              <h2 className="text-4xl font-semibold text-fg-primary">
                <AmountDisplay value={latest.totalNetWorth} currency="KES" />
              </h2>
            </div>
          ) : (
            <p className="text-fg-secondary">No net worth data available yet.</p>
          )}

          {/* Simple Bar Chart Visualization */}
          <div className="h-48 flex items-end gap-1 border-b border-border-subtle pb-2">
            {trend?.map((point, i) => {
              const value = Number(point.totalNetWorth);
              // Find max value to scale bars
              const max = Math.max(...trend.map((t) => Math.abs(Number(t.totalNetWorth))), 1);
              const height = `${(Math.abs(value) / max) * 100}%`;

              return (
                <div
                  key={i}
                  className="flex-1 bg-accent-primary/50 hover:bg-accent-primary transition-colors rounded-t-sm"
                  style={{ height }}
                  title={`${point.date}: ${value}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
