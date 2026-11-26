'use client';

import Link from 'next/link';
import { useDashboardInsights } from '@/lib/hooks/use-dashboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/api-client';
import { AlertCircle, TrendingUp, Info, CheckCircle2, X, Sparkles, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { showToast } from '@/components/ui/toast';

export default function InsightsPage() {
  const narrationEnabled = process.env.NEXT_PUBLIC_INSIGHTS_NARRATION_ENABLED === 'true';
  const { data: insights, isLoading } = useDashboardInsights();
  const queryClient = useQueryClient();

  const invalidateInsights = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'insights'] });
  };

  const narrate = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ queued: boolean; reason: string }>(`/api/insights/${id}/narrate`, { method: 'POST' }),
    onSuccess: (result) => {
      invalidateInsights();
      showToast('success', result.queued ? 'Insight explanation queued' : 'Insight narration is already processing');
    },
    onError: () => showToast('error', 'Could not queue insight explanation'),
  });

  const dismissOne = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/insights/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateInsights,
    onError: () => showToast('error', 'Failed to dismiss insight'),
  });

  const dismissAll = useMutation({
    mutationFn: () => apiFetch<void>('/api/insights', { method: 'DELETE' }),
    onSuccess: () => {
      invalidateInsights();
      showToast('success', 'All insights dismissed');
    },
    onError: () => showToast('error', 'Failed to dismiss insights'),
  });

  const getIcon = (severity: string) => {
    if (severity === 'WARNING') return <AlertCircle size={24} className="text-status-negative" />;
    if (severity === 'OPPORTUNITY') return <TrendingUp size={24} className="text-accent-primary" />;
    return <Info size={24} className="text-fg-secondary" />;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Insights</h1>
          <p className="text-fg-secondary text-sm">Deterministic observations, with optional AI explanations.</p>
        </div>
        {insights && insights.length > 0 && (
          <button onClick={() => dismissAll.mutate()} disabled={dismissAll.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border-subtle text-fg-primary text-sm font-medium hover:bg-bg-tertiary transition-colors disabled:opacity-50">
            <CheckCircle2 size={16} /> Dismiss All
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : insights && insights.length > 0 ? (
        <div className="space-y-4">
          {insights.map((insight) => {
            const narrationStatus = insight.narrationStatus ?? 'NOT_REQUESTED';
            const canQueue = narrationStatus === 'NOT_REQUESTED' || narrationStatus === 'FAILED';
            return (
              <article key={insight.id} className="bg-bg-secondary border border-border-subtle rounded-lg p-6 flex gap-4 group">
                <div className="shrink-0 mt-1">{getIcon(insight.severity)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-fg-primary mb-1">{insight.title}</h3>
                  <p className="text-sm text-fg-secondary">{insight.message}</p>

                  {insight.narrative && (
                    <div className="mt-4 rounded-md border border-border-subtle bg-bg-tertiary p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-fg-secondary mb-2">
                        <Sparkles size={14} /> AI explanation
                      </div>
                      <p className="text-sm text-fg-primary whitespace-pre-wrap">{insight.narrative}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    {insight.actionUrl && (
                      <Link href={insight.actionUrl} className="inline-flex items-center gap-1 text-xs font-medium text-accent-primary hover:underline">
                        View related records <ArrowUpRight size={13} />
                      </Link>
                    )}
                    {narrationEnabled && canQueue && (
                      <button onClick={() => narrate.mutate(insight.id)} disabled={narrate.isPending}
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent-primary hover:underline disabled:opacity-50">
                        <Sparkles size={13} /> Explain this insight
                      </button>
                    )}
                    {narrationStatus === 'QUEUED' && <span className="text-xs text-fg-tertiary">Explanation queued…</span>}
                    {narrationStatus === 'PROCESSING' && <span className="text-xs text-fg-tertiary">Generating explanation…</span>}
                    {narrationStatus === 'FAILED' && <span className="text-xs text-status-negative">AI explanation unavailable. You can retry.</span>}
                  </div>
                </div>
                <button onClick={() => dismissOne.mutate(insight.id)}
                  disabled={dismissOne.isPending && dismissOne.variables === insight.id}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-fg-tertiary hover:text-status-negative hover:bg-status-negative/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  title="Dismiss this insight">
                  <X size={18} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={CheckCircle2} title="You're all caught up!"
          description="There are no active insights right now. We'll notify you when something needs attention." />
      )}
    </div>
  );
}
