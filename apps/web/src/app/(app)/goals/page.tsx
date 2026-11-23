'use client';

import { useState } from 'react';
import {
  Plus,
  Target,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  PiggyBank,
} from 'lucide-react';
import { useGoals, useUpdateGoal, useDeleteGoal, type Goal } from '@/lib/hooks/use-goals';
import { CreateGoalModal } from '@/components/features/goals/create-goal-modal';
import { GoalProgressChart } from '@/components/features/goals/goal-progress-chart';
import { AddContributionModal } from '@/components/features/goals/add-contribution-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { ProgressBar } from '@/components/shared/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';

const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });

function ProjectionBadge({ goal }: { goal: Goal }) {
  const p = goal.projection;
  if (p.status === 'ACHIEVED') return null;

  const base = 'mt-4 flex items-start gap-2 text-xs px-3 py-2 rounded';
  const neutral = `${base} bg-bg-tertiary text-fg-secondary`;
  const warn = `${base} bg-status-warning/10 text-status-warning`;

  if (p.status === 'NO_DATA') {
    return (
      <div className={neutral}>
        <Clock size={14} className="mt-0.5 shrink-0" />
        <span>
          {goal.linkedAccountId
            ? 'Not enough savings activity yet to project a completion date.'
            : 'Add a contribution to see a projected completion date.'}
        </span>
      </div>
    );
  }

  if (p.status === 'BEHIND') {
    return (
      <div className={warn}>
        <TrendingDown size={14} className="mt-0.5 shrink-0" />
        <span>
          At your current pace: <strong>{monthYear(p.projectedCompletionDate!)}</strong> (
          {Math.abs(p.daysAhead ?? 0)} days late).
          {p.requiredMonthly ? (
            <>
              {' '}
              Save about{' '}
              <strong>
                {goal.currency} {Math.round(p.requiredMonthly).toLocaleString()}
              </strong>{' '}
              per month to hit your date.
            </>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <div className={neutral}>
      <TrendingUp size={14} className="mt-0.5 shrink-0" />
      <span>
        {p.status === 'ON_TRACK' ? 'On track: ' : 'At your current pace: '}
        <strong>{monthYear(p.projectedCompletionDate!)}</strong>
        {p.status === 'ON_TRACK' && p.daysAhead ? (
          <span className="ml-1 opacity-75">({p.daysAhead} days early)</span>
        ) : null}
      </span>
    </div>
  );
}

export default function GoalsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const { data: goals, isLoading } = useGoals();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    try {
      await updateGoal.mutateAsync({ id: editingGoal.id, targetAmount: parseFloat(editAmount) });
      showToast('success', 'Goal updated');
      setEditingGoal(null);
    } catch (err) {
      showToast('error', 'Failed to update', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal? Your history will be preserved.')) return;
    try {
      await deleteGoal.mutateAsync(id);
      showToast('success', 'Goal deleted');
    } catch (err) {
      showToast('error', 'Failed to delete', err instanceof Error ? err.message : 'Error');
    }
  };

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
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-bg-secondary border border-border-subtle rounded-lg p-6 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-fg-primary">{goal.name}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingGoal(goal);
                          setEditAmount(goal.targetAmount);
                        }}
                        className="text-fg-tertiary hover:text-accent-primary"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="text-fg-tertiary hover:text-status-negative"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-fg-secondary">
                    Target: <AmountDisplay value={goal.targetAmount} currency={goal.currency} />
                    {goal.targetDate && (
                      <span className="ml-2">by {monthYear(goal.targetDate)}</span>
                    )}
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

              <ProjectionBadge goal={goal} />

              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                  className="text-xs text-accent-primary hover:text-accent-hover font-medium"
                >
                  {expandedGoalId === goal.id ? 'Hide progress' : 'Show progress'}
                </button>
                {!goal.linkedAccountId && (
                  <button
                    onClick={() => setContributionGoal(goal)}
                    className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-hover font-medium"
                  >
                    <PiggyBank size={14} /> Add money
                  </button>
                )}
              </div>

              {expandedGoalId === goal.id && (
                <GoalProgressChart
                  goalId={goal.id}
                  currency={goal.currency}
                  targetDate={goal.targetDate}
                />
              )}
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

      <AddContributionModal goal={contributionGoal} onClose={() => setContributionGoal(null)} />

      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Edit Goal Target">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">
              Target Amount ({editingGoal?.currency ?? 'KES'})
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
              onClick={() => setEditingGoal(null)}
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
