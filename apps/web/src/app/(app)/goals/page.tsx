'use client';

import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { useGoals } from '@/lib/hooks/use-goals';
import { CreateGoalModal } from '@/components/features/goals/create-goal-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { ProgressBar } from '@/components/shared/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

export default function GoalsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: goals, isLoading } = useGoals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Savings Goals</h1>
          <p className="text-fg-secondary text-sm">Save towards the things that matter.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={18} /> Create Goal
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-bg-secondary border border-border-subtle rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-fg-primary">{goal.name}</h3>
                  <p className="text-xs text-fg-secondary">
                    Target: <AmountDisplay value={goal.targetAmount} currency={goal.currency} />
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-bg-tertiary text-fg-secondary">
                  {goal.percentage}%
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Saved</span>
                  <span className="text-fg-primary font-mono">
                    <AmountDisplay value={goal.currentAmount} currency={goal.currency} />
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Remaining</span>
                  <span className="text-fg-secondary font-mono">
                    <AmountDisplay value={goal.remaining} currency={goal.currency} />
                  </span>
                </div>
                <ProgressBar percentage={goal.percentage} className="mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create a savings goal to start building towards your future."
          action={
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Create Your First Goal
            </button>
          }
        />
      )}

      <CreateGoalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
