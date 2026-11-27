import Link from 'next/link';
import { AlertCircle, TrendingUp, Info, Sparkles, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Insight {
  id: string;
  severity: 'INFO' | 'OPPORTUNITY' | 'WARNING';
  title: string;
  message: string;
  narrative?: string | null;
  actionUrl?: string | null;
}

interface InsightsWidgetProps {
  isLoading: boolean;
  insights?: Insight[];
}

function getNarrativeText(value?: string | null): string | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const explanation = record.explanation ?? record.narrative ?? record.text;
      if (typeof explanation === 'string') return explanation;
    }
  } catch {
    // Existing plain-text narrations do not need parsing.
  }
  return value;
}

export function InsightsWidget({ isLoading, insights }: InsightsWidgetProps) {
  if (isLoading || !insights) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 h-48">
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
        <h3 className="text-sm font-medium text-fg-secondary mb-4">Insights</h3>
        <div className="flex items-center gap-3 p-4 bg-bg-tertiary rounded-md">
          <Info size={20} className="text-status-positive" />
          <p className="text-sm text-fg-primary">You're all caught up! No new insights.</p>
        </div>
      </div>
    );
  }

  const getIcon = (severity: string) => {
    if (severity === 'WARNING')
      return <AlertCircle size={20} className="text-status-negative shrink-0" />;
    if (severity === 'OPPORTUNITY')
      return <TrendingUp size={20} className="text-accent-primary shrink-0" />;
    return <Info size={20} className="text-fg-secondary shrink-0" />;
  };

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
      <h3 className="text-sm font-medium text-fg-secondary mb-4">Top Insight</h3>
      <div className="space-y-3">
        {insights.slice(0, 1).map((insight) => (
          <div key={insight.id} className="flex items-start gap-3 p-3 bg-bg-tertiary rounded-md">
            {getIcon(insight.severity)}
            <div>
              <p className="text-sm font-medium text-fg-primary">{insight.title}</p>
              <p className="text-xs text-fg-secondary mt-1">{insight.message}</p>
              {getNarrativeText(insight.narrative) && (
                <div className="mt-2 flex items-start gap-2 text-xs text-fg-primary">
                  <Sparkles size={13} className="mt-0.5 shrink-0 text-accent-primary" />
                  <p>{getNarrativeText(insight.narrative)}</p>
                </div>
              )}
              {insight.actionUrl && (
                <Link href={insight.actionUrl} className="inline-flex items-center gap-1 mt-2 text-xs text-accent-primary hover:underline">
                  View details <ArrowUpRight size={12} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
