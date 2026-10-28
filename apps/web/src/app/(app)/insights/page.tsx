'use client';

import { useDashboardInsights } from '@/lib/hooks/use-dashboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/api-client';
import { AlertCircle, TrendingUp, Info, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { showToast } from '@/components/ui/toast';

export default function InsightsPage() {
  const { data: insights, isLoading } = useDashboardInsights();
  const queryClient = useQueryClient();

  const dismissAll = useMutation({
    mutationFn: () => apiFetch<void>('/api/insights', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'insights'] });
      showToast('success', 'All insights dismissed');
    },
  });

  const getIcon = (severity: string) => {
    if (severity === 'WARNING') return <AlertCircle size={24} className="text-status-negative" />;
    if (severity === 'OPPORTUNITY') return <TrendingUp size={24} className="text-accent-primary" />;
    return <Info size={24} className="text-fg-secondary" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Insights</h1>
          <p className="text-fg-secondary text-sm">
            Observations and recommendations from your data.
          </p>
        </div>
        {insights && insights.length > 0 && (
          <button
            onClick={() => dismissAll.mutate()}
            disabled={dismissAll.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border-subtle text-fg-primary text-sm font-medium hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> Dismiss All
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : insights && insights.length > 0 ? (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="bg-bg-secondary border border-border-subtle rounded-lg p-6 flex gap-4"
            >
              <div className="shrink-0 mt-1">{getIcon(insight.severity)}</div>
              <div>
                <h3 className="font-medium text-fg-primary mb-1">{insight.title}</h3>
                <p className="text-sm text-fg-secondary">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="You're all caught up!"
          description="There are no active insights right now. We'll notify you when something needs attention."
        />
      )}
    </div>
  );
}
