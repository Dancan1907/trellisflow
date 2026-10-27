'use client';

import { useState } from 'react';
import { Plus, Calendar, Clock, Edit, PauseCircle, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useRecurringRules,
  useUpcomingBills,
  useUpdateRecurringRule,
  useToggleRuleStatus,
} from '@/lib/hooks/use-recurring';
import { CreateRuleModal } from '@/components/features/recurring/create-rule-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';

export default function RecurringPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');

  const { data: rules, isLoading } = useRecurringRules();
  const { data: upcoming } = useUpcomingBills();
  const updateRule = useUpdateRecurringRule();
  const toggleStatus = useToggleRuleStatus();
  const pathname = usePathname();

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    try {
      await updateRule.mutateAsync({ id: editingRule.id, amount: parseFloat(editAmount) });
      showToast('success', 'Rule updated');
      setEditingRule(null);
    } catch (err) {
      showToast('error', 'Failed to update', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    try {
      await toggleStatus.mutateAsync({
        id,
        action: currentStatus === 'ACTIVE' ? 'pause' : 'resume',
      });
      showToast('success', `Rule ${currentStatus === 'ACTIVE' ? 'paused' : 'resumed'}`);
    } catch (err) {
      showToast('error', 'Failed to toggle status', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Recurring Rules</h1>
          <p className="text-fg-secondary text-sm">Manage your automatic income and bills.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={18} /> Add Rule
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border-subtle">
        <Link
          href="/personal"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Accounts
        </Link>
        <Link
          href="/personal/categories"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal/categories' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Categories
        </Link>
        <Link
          href="/personal/recurring"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal/recurring' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Recurring
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-medium text-fg-primary">All Rules</h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 bg-bg-secondary border border-border-subtle rounded-lg group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-medium ${rule.status === 'ACTIVE' ? 'text-fg-primary' : 'text-fg-secondary line-through'}`}
                      >
                        {rule.description}
                      </p>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${rule.status === 'ACTIVE' ? 'bg-status-positive/10 text-status-positive' : 'bg-bg-tertiary text-fg-secondary'}`}
                      >
                        {rule.status}
                      </span>
                    </div>
                    <p className="text-xs text-fg-secondary flex items-center gap-1 mt-1">
                      <Clock size={12} /> {rule.frequency} • Next:{' '}
                      {new Date(rule.nextOccurrence).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <AmountDisplay
                      value={rule.amount}
                      currency={rule.currency}
                      colorize={rule.type === 'INCOME'}
                    />

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingRule(rule);
                          setEditAmount(rule.amount);
                        }}
                        className="p-1 text-fg-tertiary hover:text-accent-primary"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggle(rule.id, rule.status)}
                        className="p-1 text-fg-tertiary hover:text-status-warning"
                      >
                        {rule.status === 'ACTIVE' ? (
                          <PauseCircle size={16} />
                        ) : (
                          <PlayCircle size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No recurring rules"
              description="Create a rule to automate your rent, salary, or subscriptions."
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <h2 className="text-lg font-medium text-fg-primary mb-4">Upcoming (30 days)</h2>
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4 space-y-3">
            {upcoming && upcoming.length > 0 ? (
              upcoming.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between text-sm border-b border-border-subtle last:border-0 pb-2 last:pb-0"
                >
                  <div>
                    <p className="text-fg-primary">{u.description}</p>
                    <p className="text-xs text-fg-secondary">
                      {new Date(u.nextOccurrence).toLocaleDateString()}
                    </p>
                  </div>
                  <AmountDisplay value={u.amount} currency={u.currency} />
                </div>
              ))
            ) : (
              <p className="text-sm text-fg-secondary text-center py-4">No upcoming bills.</p>
            )}
          </div>
        </div>
      </div>

      <CreateRuleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <Modal isOpen={!!editingRule} onClose={() => setEditingRule(null)} title="Edit Rule Amount">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">Amount (KES)</label>
            <input
              type="number"
              step="0.01"
              required
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingRule(null)}
              className="px-4 py-2 text-sm text-fg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
