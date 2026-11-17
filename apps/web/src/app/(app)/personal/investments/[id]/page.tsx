'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useHolding } from '@/lib/hooks/use-holdings';
import {
  useInvestmentEvents,
  useDeleteInvestmentEvent,
  type InvestmentEvent,
} from '@/lib/hooks/use-investment-events';
import { safeNumber } from '@/lib/utils/format-numbers';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { showToast } from '@/components/ui/toast';
import { CreateEventModal } from '@/components/features/investments/create-event-modal';

export default function HoldingDetailPage() {
  const params = useParams();
  const holdingId = params.id as string;
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: holding, isLoading: holdingLoading } = useHolding(holdingId);
  const { data: events, isLoading: eventsLoading } = useInvestmentEvents(holdingId);
  const deleteEvent = useDeleteInvestmentEvent();

  const handleDelete = async (eventId: string) => {
    if (!confirm('Delete this event? The holding quantity will be recalculated.')) return;
    try {
      await deleteEvent.mutateAsync({ id: eventId, holdingId });
      showToast('success', 'Event deleted');
    } catch (err) {
      showToast('error', 'Failed to delete', err instanceof Error ? err.message : 'Error');
    }
  };

  if (holdingLoading || !holding) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const cost = safeNumber(holding.costBasisTotal);
  const current = safeNumber(holding.currentValueTotal);
  const gain = current - cost;
  const gainPct = cost === 0 ? 0 : (gain / cost) * 100;
  const isGain = gain >= 0;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back link */}
      <Link
        href="/personal/investments"
        className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} /> Back to Investments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-fg-primary">{holding.name}</h1>
            {holding.symbol && (
              <span className="text-sm text-fg-tertiary font-mono px-2 py-0.5 bg-bg-tertiary rounded">
                {holding.symbol}
              </span>
            )}
          </div>
          <p className="text-fg-secondary text-sm">
            {holding.assetClass.replace(/_/g, ' ')} · {holding.quantity} units
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover"
        >
          <Plus size={18} /> Record Event
        </button>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Current Value" value={current} currency={holding.currency} />
        <MetricCard label="Total Cost" value={cost} currency={holding.currency} />
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
          <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-3">
            Unrealized Gain
          </p>
          <div className="flex items-baseline gap-2">
            <p
              className={`text-2xl font-semibold font-mono ${
                isGain ? 'text-status-positive' : 'text-status-negative'
              }`}
            >
              {isGain ? (
                <TrendingUp size={20} className="inline mb-1" />
              ) : (
                <TrendingDown size={20} className="inline mb-1" />
              )}{' '}
              <AmountDisplay value={Math.abs(gain)} currency={holding.currency} />
            </p>
          </div>
          <p className={`text-xs mt-1 ${isGain ? 'text-status-positive' : 'text-status-negative'}`}>
            {isGain ? '+' : ''}
            {gainPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Events timeline */}
      <div>
        <h2 className="text-lg font-medium text-fg-primary mb-4">Event History</h2>

        {eventsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                currency={holding.currency}
                onDelete={() => handleDelete(event.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No events recorded"
            description="Record a buy, sell, or dividend to start tracking this holding's history."
            action={
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover"
              >
                Record Your First Event
              </button>
            }
          />
        )}
      </div>

      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        containerId={holding.containerId}
        holdingId={holding.id}
        holdingName={holding.name}
        currency={holding.currency}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: string;
}) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
      <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-3">{label}</p>
      <p className="text-2xl font-semibold text-fg-primary font-mono">
        <AmountDisplay value={value} currency={currency} />
      </p>
    </div>
  );
}

function EventRow({
  event,
  currency,
  onDelete,
}: {
  event: InvestmentEvent;
  currency: string;
  onDelete: () => void;
}) {
  const colors = {
    BUY: 'text-accent-primary bg-accent-primary/10 border-accent-primary/30',
    SELL: 'text-status-positive bg-status-positive/10 border-status-positive/30',
    DIVIDEND: 'text-status-positive bg-status-positive/10 border-status-positive/30',
    CONTRIBUTION: 'text-fg-secondary bg-bg-tertiary border-border-subtle',
    WITHDRAWAL: 'text-status-negative bg-status-negative/10 border-status-negative/30',
  };
  const badgeClass = colors[event.eventType];

  const hasRealizedGain = event.realizedGain !== null && safeNumber(event.realizedGain) !== 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-bg-secondary border border-border-subtle rounded-lg group">
      <span className={`shrink-0 px-2 py-1 rounded text-xs font-medium border ${badgeClass}`}>
        {event.eventType}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-fg-primary">
          {event.quantity ? `${event.quantity} units · ` : ''}
          <span className="font-mono">
            <AmountDisplay value={safeNumber(event.totalAmount)} currency={currency} />
          </span>
        </p>
        {event.notes && <p className="text-xs text-fg-secondary mt-0.5 truncate">{event.notes}</p>}
      </div>
      <div className="text-right shrink-0">
        {hasRealizedGain && (
          <p className="text-xs font-medium text-status-positive mb-0.5">
            Gain: <AmountDisplay value={safeNumber(event.realizedGain)} currency={currency} />
          </p>
        )}
        <p className="text-xs text-fg-tertiary">{new Date(event.date).toLocaleDateString()}</p>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-fg-tertiary hover:text-status-negative transition-opacity p-1"
        title="Delete event"
      >
        ×
      </button>
    </div>
  );
}
