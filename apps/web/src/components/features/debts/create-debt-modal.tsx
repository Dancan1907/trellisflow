'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';
import { useCreateDebt } from '@/lib/hooks/use-debts';
import { useAccounts } from '@/lib/hooks/use-accounts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateDebtModal({ isOpen, onClose }: Props) {
  const createDebt = useCreateDebt();
  const { data: accounts } = useAccounts();

  const liabilityAccounts = (accounts ?? []).filter(
    (a) => a.category === 'LIABILITY' && a.status === 'ACTIVE',
  );

  const [accountId, setAccountId] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary transition-colors';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDebt.mutateAsync({
        accountId,
        minimumPayment: parseFloat(minimumPayment),
        interestRate: parseFloat(interestRate),
      });
      showToast('success', 'Debt added to planner');
      setAccountId('');
      setMinimumPayment('');
      setInterestRate('');
      onClose();
    } catch (err) {
      showToast('error', 'Failed to add debt', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Debt to Planner">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">
            Liability Account
          </label>
          <select
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a debt...</option>
            {liabilityAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency} {Number(a.currentBalance).toLocaleString()})
              </option>
            ))}
          </select>
          {liabilityAccounts.length === 0 && (
            <p className="text-xs text-status-warning mt-1">
              No liability accounts found. Create one in Personal → Accounts first.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Min. Monthly Payment
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={minimumPayment}
              onChange={(e) => setMinimumPayment(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Annual Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="e.g. 18.5"
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-fg-secondary hover:bg-bg-tertiary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createDebt.isPending || liabilityAccounts.length === 0}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createDebt.isPending ? 'Adding…' : 'Add Debt'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
