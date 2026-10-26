'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateAccount } from '@/lib/hooks/use-accounts';
import { showToast } from '@/components/ui/toast';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string; // The ID of the Personal container
}

export function CreateAccountModal({ isOpen, onClose, containerId }: CreateAccountModalProps) {
  const createAccount = useCreateAccount();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'ASSET' | 'LIABILITY'>('ASSET');
  const [accountType, setAccountType] = useState('CHECKING');
  const [balance, setBalance] = useState('0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount.mutateAsync({
        name,
        category,
        accountType,
        currency: 'KES',
        initialBalance: parseFloat(balance),
        containerId,
      });
      showToast('success', 'Account created', `${name} has been added.`);
      onClose();
      // Reset form
      setName('');
      setBalance('0');
    } catch (error) {
      showToast(
        'error',
        'Failed to create account',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add a new account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Account Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
            placeholder="e.g., M-Pesa Wallet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'ASSET' | 'LIABILITY')}
            className={inputClass}
          >
            <option value="ASSET">Asset (I own this)</option>
            <option value="LIABILITY">Liability (I owe this)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Type</label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className={inputClass}
          >
            <option value="CHECKING">Checking</option>
            <option value="SAVINGS">Savings</option>
            <option value="CASH">Cash</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="PERSONAL_LOAN">Personal Loan</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">
            Starting Balance (KES)
          </label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className={inputClass}
            placeholder="0.00"
            step="0.01"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAccount.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {createAccount.isPending ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
