'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateTransaction } from '@/lib/hooks/use-transactions';
import { useCategories } from '@/lib/hooks/use-categories';
import { showToast } from '@/components/ui/toast';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  currency: string;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  accountId,
  currency,
}: AddTransactionModalProps) {
  const createTx = useCreateTransaction();
  const { data: categories } = useCategories();
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTx.mutateAsync({
        type,
        amount: parseFloat(amount),
        date,
        description,
        categoryId: categoryId || undefined,
        accountId,
      });
      showToast('success', 'Transaction saved', 'Your balance has been updated.');
      onClose();
      setAmount('');
      setDescription('');
    } catch (err) {
      showToast('error', 'Failed to save', err instanceof Error ? err.message : 'Error');
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';
  const filteredCategories = categories?.filter((c) => c.type === type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
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
          <label className="block text-sm font-medium text-fg-primary mb-2">
            Amount ({currency})
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
          <label className="block text-sm font-medium text-fg-primary mb-2">Description</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="e.g., Lunch at Naivas"
          />
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

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
            disabled={createTx.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createTx.isPending ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
