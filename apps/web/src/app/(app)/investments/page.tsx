'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, Wallet, ArrowRight, Building2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/api-client';
import { useHoldings } from '@/lib/hooks/use-holdings';
import { useAllocation } from '@/lib/hooks/use-allocation';
import { safeNumber } from '@/lib/utils/format-numbers';
import { CreateHoldingModal } from '@/components/features/investments/create-holding-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { showToast } from '@/components/ui/toast';

interface Container {
  id: string;
  name: string;
  type: string;
  currency: string;
}

interface Account {
  id: string;
  name: string;
  containerId: string;
  currency: string;
}

export default function InvestmentsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: allocation, isLoading: allocationLoading } = useAllocation();
  const { data: containers, isLoading: containersLoading } = useQuery({
    queryKey: ['containers'],
    queryFn: () => apiFetch<Container[]>('/api/containers'),
  });
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<Account[]>('/api/accounts'),
  });

  const isLoading = holdingsLoading || allocationLoading || containersLoading || accountsLoading;

  // Check if we have an investment container
  const hasInvestmentContainer = containers?.some((c) => c.type === 'INVESTMENT');

  // Mutation to create a default investment container + account
  const setupInvestment = useMutation({
    mutationFn: async () => {
      // 1. Create Container
      const container = await apiFetch<Container>('/api/containers', {
        method: 'POST',
        body: JSON.stringify({ type: 'INVESTMENT', name: 'My Portfolio', currency: 'KES' }),
      });

      // 2. Create Account inside it
      await apiFetch('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          containerId: container.id,
          name: 'Brokerage Account',
          category: 'ASSET',
          accountType: 'INVESTMENT_ACCOUNT',
          currency: 'KES',
        }),
      });

      return container;
    },
    onSuccess: () => {
      showToast('success', 'Setup complete', 'Investment portfolio is ready.');
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err) => {
      showToast('error', 'Setup failed', err instanceof Error ? err.message : 'Error');
    },
  });

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Investments</h1>
          <p className="text-fg-secondary text-sm">
            Track your portfolio across all asset classes.
          </p>
        </div>
        {hasInvestmentContainer && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            <Plus size={18} /> Add Holding
          </button>
        )}
      </div>

      {/* Missing Setup State */}
      {!isLoading && !hasInvestmentContainer ? (
        <EmptyState
          icon={Building2}
          title="Set up your Investment Portfolio"
          description="You need an investment container and account before you can track holdings."
          action={
            <button
              onClick={() => setupInvestment.mutate()}
              disabled={setupInvestment.isPending}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
            >
              {setupInvestment.isPending ? 'Setting up…' : 'Auto-Create Investment Portfolio'}
            </button>
          }
        />
      ) : (
        <>
          {/* Summary cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard
                label="Total Portfolio Value"
                value={allocation?.totalValue ?? 0}
                currency={allocation?.currency ?? 'KES'}
                icon={Wallet}
              />
              <SummaryCard
                label="Number of Holdings"
                value={holdings?.length ?? 0}
                currency=""
                icon={TrendingUp}
                isCount
              />
              <SummaryCard
                label="Allocation Classes"
                value={allocation?.breakdown.length ?? 0}
                currency=""
                icon={TrendingUp}
                isCount
              />
            </div>
          )}

          {/* Holdings list */}
          <div>
            <h2 className="text-lg font-medium text-fg-primary mb-4">Your Holdings</h2>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : holdings && holdings.length > 0 ? (
              <div className="space-y-2">
                {holdings.map((holding) => {
                  const cost = safeNumber(holding.costBasisTotal);
                  const current = safeNumber(holding.currentValueTotal);
                  const gain = current - cost;
                  const gainPct = cost === 0 ? 0 : (gain / cost) * 100;

                  return (
                    <Link
                      key={holding.id}
                      href={`/investments/${holding.id}`}
                      className="flex items-center gap-4 p-4 bg-bg-secondary border border-border-subtle rounded-lg hover:bg-bg-tertiary/50 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-md bg-accent-subtle flex items-center justify-center shrink-0">
                        <TrendingUp size={20} className="text-accent-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-fg-primary truncate">
                            {holding.name}
                          </p>
                          {holding.symbol && (
                            <span className="text-xs text-fg-tertiary font-mono">
                              {holding.symbol}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-fg-secondary mt-0.5">
                          {holding.assetClass.replace(/_/g, ' ')} · {holding.quantity} units
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-fg-primary font-mono">
                          <AmountDisplay value={current} currency={holding.currency} />
                        </p>
                        <p
                          className={`text-xs font-medium ${
                            gain >= 0 ? 'text-status-positive' : 'text-status-negative'
                          }`}
                        >
                          {gain >= 0 ? '+' : ''}
                          {gain.toFixed(2)} ({gainPct.toFixed(1)}%)
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-fg-tertiary group-hover:text-fg-primary shrink-0"
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No holdings yet"
                description="Start tracking your investments by adding your first holding."
                action={
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover"
                  >
                    Add Your First Holding
                  </button>
                }
              />
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <CreateHoldingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        containers={containers ?? []}
        accounts={accounts ?? []}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  currency,
  icon: Icon,
  isCount = false,
}: {
  label: string;
  value: number;
  currency: string;
  icon: any;
  isCount?: boolean;
}) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-md bg-accent-subtle flex items-center justify-center">
          <Icon size={16} className="text-accent-primary" />
        </div>
        <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-fg-primary font-mono">
        {isCount ? value : <AmountDisplay value={value} currency={currency} />}
      </p>
    </div>
  );
}
