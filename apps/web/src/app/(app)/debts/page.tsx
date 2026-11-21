'use client';

import { useState } from 'react';
import { Plus, CreditCard, Trash2, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import {
  useDebts,
  useDeleteDebt,
  useSimulateDebt,
  type SimulationResult,
} from '@/lib/hooks/use-debts';
import { CreateDebtModal } from '@/components/features/debts/create-debt-modal';
import { DebtBalanceChart } from '@/components/features/debts/debt-balance-chart';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { showToast } from '@/components/ui/toast';

export default function DebtsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [method, setMethod] = useState<'SNOWBALL' | 'AVALANCHE'>('SNOWBALL');
  const [extraPayment, setExtraPayment] = useState('0');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const { data: debts, isLoading } = useDebts();
  const deleteDebt = useDeleteDebt();
  const simulateDebt = useSimulateDebt();

  const totalDebt = (debts ?? []).reduce((sum, d) => sum + Number(d.account.currentBalance), 0);
  const currency = debts?.[0]?.account.currency || 'KES';

  const handleSimulate = async () => {
    try {
      const result = await simulateDebt.mutateAsync({
        extraMonthlyPayment: parseFloat(extraPayment) || 0,
        method,
      });
      setSimulation(result);
    } catch (err) {
      showToast('error', 'Simulation failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this debt from the planner?')) return;
    try {
      await deleteDebt.mutateAsync(id);
      showToast('success', 'Debt removed');
    } catch (err) {
      showToast('error', 'Failed to remove', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Debt Payoff Planner</h1>
          <p className="text-fg-secondary text-sm">
            Simulate your snowball or avalanche strategy and see the payoff date.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={18} /> Add Debt
        </button>
      </div>

      {/* Summary Card */}
      {debts && debts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-2">
              Total Debt
            </p>
            <p className="text-2xl font-semibold font-mono text-status-negative">
              <AmountDisplay value={totalDebt} currency={currency} />
            </p>
          </div>
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-2">
              Active Debts
            </p>
            <p className="text-2xl font-semibold text-fg-primary">{debts.length}</p>
          </div>
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-2">
              Min. Monthly Outflow
            </p>
            <p className="text-2xl font-semibold font-mono text-fg-primary">
              <AmountDisplay
                value={debts.reduce((s, d) => s + Number(d.minimumPayment), 0)}
                currency={currency}
              />
            </p>
          </div>
        </div>
      )}

      {/* Simulation Controls */}
      {debts && debts.length > 0 && (
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
          <h2 className="text-lg font-medium text-fg-primary mb-4">Run Simulation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">Strategy</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as 'SNOWBALL' | 'AVALANCHE')}
                className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary"
              >
                <option value="SNOWBALL">Snowball (smallest balance first)</option>
                <option value="AVALANCHE">Avalanche (highest interest first)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">
                Extra Monthly Payment ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSimulate}
                disabled={simulateDebt.isPending}
                className="w-full h-10 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
              >
                {simulateDebt.isPending ? 'Simulating…' : 'Run Simulation'}
              </button>
            </div>
          </div>

          {simulation && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-tertiary/50 rounded-md p-4">
                  <div className="flex items-center gap-2 text-xs text-fg-secondary uppercase mb-1">
                    <Calendar size={12} /> Payoff Date
                  </div>
                  <p className="text-lg font-semibold text-fg-primary">
                    {new Date(simulation.payoffDate).toLocaleDateString('en-KE', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-fg-tertiary">{simulation.monthsToPayoff} months</p>
                </div>
                <div className="bg-bg-tertiary/50 rounded-md p-4">
                  <div className="flex items-center gap-2 text-xs text-fg-secondary uppercase mb-1">
                    <DollarSign size={12} /> Total Interest
                  </div>
                  <p className="text-lg font-semibold text-status-negative font-mono">
                    {currency} {simulation.totalInterestPaid.toLocaleString()}
                  </p>
                  <p className="text-xs text-fg-tertiary">
                    Over {simulation.monthsToPayoff} months
                  </p>
                </div>
                <div className="bg-bg-tertiary/50 rounded-md p-4">
                  <div className="flex items-center gap-2 text-xs text-fg-secondary uppercase mb-1">
                    <TrendingDown size={12} /> Strategy
                  </div>
                  <p className="text-lg font-semibold text-fg-primary">
                    {simulation.method === 'SNOWBALL' ? 'Snowball' : 'Avalanche'}
                  </p>
                  <p className="text-xs text-fg-tertiary">
                    +{currency} {simulation.monthlyExtra}/mo extra
                  </p>
                </div>
              </div>
              <div className="bg-bg-primary border border-border-subtle rounded-md p-4">
                <p className="text-xs font-medium text-fg-secondary uppercase mb-2">
                  Debt Balance Over Time
                </p>
                <DebtBalanceChart simulation={simulation} currency={currency} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debts List */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !debts || debts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No debts yet"
          description="Add a liability account to start planning your payoff strategy."
          action={
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover"
            >
              Add Your First Debt
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {debts.map((debt) => (
            <div
              key={debt.id}
              className="flex items-center gap-4 p-4 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <div className="w-10 h-10 rounded-md bg-status-negative/10 flex items-center justify-center shrink-0">
                <CreditCard size={18} className="text-status-negative" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg-primary truncate">{debt.account.name}</p>
                <p className="text-xs text-fg-secondary">
                  {debt.interestRate}% APR · Min {debt.account.currency}{' '}
                  {Number(debt.minimumPayment).toLocaleString()}/mo
                </p>
              </div>
              <p className="text-sm font-medium text-status-negative font-mono shrink-0">
                <AmountDisplay
                  value={Number(debt.account.currentBalance)}
                  currency={debt.account.currency}
                />
              </p>
              <button
                onClick={() => handleDelete(debt.id)}
                className="p-2 rounded-md text-fg-tertiary hover:text-status-negative hover:bg-bg-tertiary transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateDebtModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
