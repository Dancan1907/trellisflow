'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateBudget } from '@/lib/hooks/use-budgets';
import { useCategories } from '@/lib/hooks/use-categories';
import { useDashboardContainers } from '@/lib/hooks/use-dashboard';
import { showToast } from '@/components/ui/toast';

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBudgetModal({ isOpen, onClose }: CreateBudgetModalProps) {
  const createBudget = useCreateBudget();
  const { data: categories } = useCategories();
  const { data: containers } = useDashboardContainers();

  const [containerId, setContainerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('MONTHLY');
  const [method, setMethod] = useState<'TARGET' | 'ENVELOPE'>('TARGET');

  const availableContainers = containers?.filter(
    (c) => c.type === 'PERSONAL' || c.type === 'INTERNAL_BUSINESS',
  );
  const selectedContainerId = containerId || availableContainers?.[0]?.id || '';
  const selectedContainer = containers?.find((c) => c.id === selectedContainerId);
  const expenseCategories = categories?.filter((c) => c.type === 'EXPENSE') || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainerId) return;

    try {
      await createBudget.mutateAsync({
        containerId: selectedContainerId,
        categoryId,
        amount: parseFloat(amount),
        currency: selectedContainer?.currency || 'KES',
        period,
        method,
        rollover: true,
      });
      showToast('success', 'Budget created', 'You can now track your spending.');
      onClose();
      setAmount('');
      setCategoryId('');
      setMethod('TARGET');
    } catch (err) {
      showToast('error', 'Failed to create budget', err instanceof Error ? err.message : 'Error');
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Budget">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Container</label>
          <select
            required
            value={selectedContainerId}
            onChange={(e) => setContainerId(e.target.value)}
            className={inputClass}
          >
            {availableContainers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === 'PERSONAL' ? 'Personal' : 'Business'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Category</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a category...</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">
            Target Amount ({selectedContainer?.currency || 'KES'})
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass}>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'TARGET' | 'ENVELOPE')}
            className={inputClass}
          >
            <option value="TARGET">Target (Track against goal)</option>
            <option value="ENVELOPE">Envelope (Strict cash limit)</option>
          </select>
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
            disabled={createBudget.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createBudget.isPending ? 'Creating...' : 'Create Budget'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
