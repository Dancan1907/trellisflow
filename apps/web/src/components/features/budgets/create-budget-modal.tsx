'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateBudget } from '@/lib/hooks/use-budgets';
import { useCategories } from '@/lib/hooks/use-categories';
import { useDashboardContainers } from '@/lib/hooks/use-dashboard';
import { useBusinesses } from '@/lib/hooks/use-businesses';
import { showToast } from '@/components/ui/toast';

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ContainerOption {
  id: string;
  name: string;
  type: string;
  currency: string;
}

const BUDGETABLE_TYPES = ['PERSONAL', 'INTERNAL_BUSINESS'];

export function CreateBudgetModal({ isOpen, onClose }: CreateBudgetModalProps) {
  const createBudget = useCreateBudget();
  const { data: categories } = useCategories();
  const { data: dashboardContainers, isLoading: dashboardLoading } = useDashboardContainers();
  const { data: businesses, isLoading: businessesLoading } = useBusinesses();

  const [containerId, setContainerId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('MONTHLY');
  const [method, setMethod] = useState<'TARGET' | 'ENVELOPE'>('TARGET');

  const isLoading = dashboardLoading || businessesLoading;

  // Merge containers from both dashboard + businesses (dedupe by id)
  const availableContainers = useMemo<ContainerOption[]>(() => {
    const merged = new Map<string, ContainerOption>();

    const addContainer = (id: string, name: string, type: string, currency: string) => {
      if (type && BUDGETABLE_TYPES.includes(type) && !merged.has(id)) {
        merged.set(id, { id, name, type, currency });
      }
    };

    // Handle both array and wrapped-object responses defensively
    const dashboardList = Array.isArray(dashboardContainers)
      ? dashboardContainers
      : (dashboardContainers as any)?.containers || [];

    dashboardList.forEach((c: any) => addContainer(c.id, c.name, c.type, c.currency));

    if (Array.isArray(businesses)) {
      businesses.forEach((b) => addContainer(b.id, b.name, b.type, b.currency));
    }

    return Array.from(merged.values());
  }, [dashboardContainers, businesses]);

  const selectedContainerId = containerId || availableContainers[0]?.id || '';
  const selectedContainer = availableContainers.find((c) => c.id === selectedContainerId);
  const expenseCategories = categories?.filter((c) => c.type === 'EXPENSE') || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainerId) {
      showToast('error', 'Please select a container');
      return;
    }

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
      setContainerId('');
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
          {isLoading ? (
            <div className={`${inputClass} flex items-center text-fg-tertiary`}>
              Loading containers...
            </div>
          ) : availableContainers.length === 0 ? (
            <div className="p-3 rounded-md border border-status-negative/30 bg-status-negative/10 text-status-negative text-sm">
              No containers available. Please create a personal account or an internal business
              first.
            </div>
          ) : (
            <select
              required
              value={selectedContainerId}
              onChange={(e) => setContainerId(e.target.value)}
              className={inputClass}
            >
              {availableContainers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'PERSONAL' ? 'Personal' : 'Business'})
                </option>
              ))}
            </select>
          )}
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
            disabled={createBudget.isPending || availableContainers.length === 0}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createBudget.isPending ? 'Creating...' : 'Create Budget'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
