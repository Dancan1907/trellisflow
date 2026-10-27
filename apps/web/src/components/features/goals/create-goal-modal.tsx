'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateGoal } from '@/lib/hooks/use-goals';
import { useDashboardContainers } from '@/lib/hooks/use-dashboard';
import { showToast } from '@/components/ui/toast';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGoalModal({ isOpen, onClose }: CreateGoalModalProps) {
  const createGoal = useCreateGoal();
  const { data: containers } = useDashboardContainers();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const personalContainer = containers?.find((c) => c.type === 'PERSONAL');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalContainer) return;

    try {
      await createGoal.mutateAsync({
        name,
        targetAmount: parseFloat(targetAmount),
        currency: 'KES',
        containerId: personalContainer.id,
        targetDate: targetDate || undefined,
      });
      showToast('success', 'Goal created', 'Start saving towards your target.');
      onClose();
      setName('');
      setTargetAmount('');
      setTargetDate('');
    } catch (err) {
      showToast('error', 'Failed to create goal', err instanceof Error ? err.message : 'Error');
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Savings Goal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Goal Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g., Emergency Fund"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">
            Target Amount (KES)
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">
            Target Date (Optional)
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-fg-secondary hover:bg-bg-tertiary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createGoal.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createGoal.isPending ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
