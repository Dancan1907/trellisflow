'use client';

import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { useBudgets } from '@/lib/hooks/use-budgets';
import { useCategories } from '@/lib/hooks/use-categories';
import { CreateBudgetModal } from '@/components/features/budgets/create-budget-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { ProgressBar } from '@/components/shared/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

export default function BudgetsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: budgets, isLoading } = useBudgets();
  const { data: categories } = useCategories();

  const getCategoryName = (id: string) => categories?.find((c) => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Budgets</h1>
          <p className="text-fg-secondary text-sm">Set limits and track your spending.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={18} /> Create Budget
        </button>
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
              className="bg-bg-secondary border border-border-subtle rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-fg-primary">
                    {getCategoryName(budget.categoryId)}
                  </h3>
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
          description="Create a budget to start tracking your spending limits."
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
    </div>
  );
}
