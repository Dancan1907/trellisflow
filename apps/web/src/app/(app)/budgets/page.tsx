'use client';

import { useState } from 'react';
import { Plus, Wallet, Copy, Edit, Trash2 } from 'lucide-react';
import {
  useBudgets,
  useUpdateBudget,
  useDeleteBudget,
  useCopyPreviousBudgets,
} from '@/lib/hooks/use-budgets';
import { useCategories } from '@/lib/hooks/use-categories';
import { CreateBudgetModal } from '@/components/features/budgets/create-budget-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { ProgressBar } from '@/components/shared/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';

export default function BudgetsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');

  const { data: budgets, isLoading } = useBudgets();
  const { data: categories } = useCategories();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const copyPrevious = useCopyPreviousBudgets();

  const getCategoryName = (id: string) => categories?.find((c) => c.id === id)?.name || 'Unknown';

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    try {
      await updateBudget.mutateAsync({ id: editingBudget.id, amount: parseFloat(editAmount) });
      showToast('success', 'Budget updated');
      setEditingBudget(null);
    } catch (err) {
      showToast('error', 'Failed to update', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget? Your history will be preserved.')) return;
    try {
      await deleteBudget.mutateAsync(id);
      showToast('success', 'Budget deleted');
    } catch (err) {
      showToast('error', 'Failed to delete', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleCopy = async () => {
    try {
      const result = await copyPrevious.mutateAsync();
      showToast('success', `${result.copied} budgets copied to this month`);
    } catch (err) {
      showToast('error', 'Failed to copy budgets', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Budgets</h1>
          <p className="text-fg-secondary text-sm">Set limits and track your spending.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border-subtle text-fg-primary text-sm font-medium hover:bg-bg-tertiary transition-colors"
          >
            <Copy size={16} /> Copy Previous
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            <Plus size={18} /> Create Budget
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : budgets && budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => (
            <div
              key={budget.id}
              className="bg-bg-secondary border border-border-subtle rounded-lg p-6 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-fg-primary">
                      {getCategoryName(budget.categoryId)}
                    </h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingBudget(budget);
                          setEditAmount(budget.amount);
                        }}
                        className="text-fg-tertiary hover:text-accent-primary"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="text-fg-tertiary hover:text-status-negative"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-fg-secondary">{budget.container.name}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${budget.percentage >= 100 ? 'bg-status-negative/10 text-status-negative' : 'bg-bg-tertiary text-fg-secondary'}`}
                >
                  {budget.percentage}%
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Spent</span>
                  <span className="text-fg-primary font-mono">
                    <AmountDisplay value={budget.spent} currency={budget.currency} />
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Remaining</span>
                  <span
                    className={`font-mono ${budget.remaining < 0 ? 'text-status-negative' : 'text-status-positive'}`}
                  >
                    <AmountDisplay value={budget.remaining} currency={budget.currency} />
                  </span>
                </div>
                <ProgressBar percentage={budget.percentage} />
                <p className="text-xs text-fg-secondary text-right mt-2">
                  Target: <AmountDisplay value={budget.amount} currency={budget.currency} />
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Wallet}
          title="No budgets yet"
          description="Create a budget or copy last month's budgets to get started."
          action={
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Create Your First Budget
            </button>
          }
        />
      )}

      <CreateBudgetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <Modal
        isOpen={!!editingBudget}
        onClose={() => setEditingBudget(null)}
        title="Edit Budget Target"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">
              Target Amount (KES)
            </label>
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
              onClick={() => setEditingBudget(null)}
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
