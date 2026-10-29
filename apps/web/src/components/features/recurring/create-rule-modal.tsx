'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateRecurringRule } from '@/lib/hooks/use-recurring';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { useCategories } from '@/lib/hooks/use-categories';
import { showToast } from '@/components/ui/toast';

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRuleModal({ isOpen, onClose }: CreateRuleModalProps) {
  const createRule = useCreateRecurringRule();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRule.mutateAsync({
        type,
        amount: parseFloat(amount),
        accountId,
        categoryId: categoryId || undefined,
        description,
        frequency,
        startDate,
      });
      showToast('success', 'Rule created', 'The recurring rule has been saved.');
      onClose();
      // Reset
      setAmount('');
      setDescription('');
    } catch (err) {
      showToast('error', 'Failed to save rule', err instanceof Error ? err.message : 'Error');
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';
  const filteredCategories = categories?.filter((c) => c.type === type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Recurring Rule">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-bg-tertiary rounded-md">
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            className={`py-1.5 text-sm font-medium rounded ${type === 'EXPENSE' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            className={`py-1.5 text-sm font-medium rounded ${type === 'INCOME' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}
          >
            Income
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Amount (KES)</label>
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
          <label className="block text-sm font-medium text-fg-primary mb-2">Description</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="e.g., Monthly Rent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Account</label>
          <select
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select an account...</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="">Uncategorized</option>
            {filteredCategories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className={inputClass}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">Start Date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
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
            disabled={createRule.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createRule.isPending ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
