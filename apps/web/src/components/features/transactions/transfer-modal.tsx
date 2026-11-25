'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { useCreateTransfer } from '@/lib/hooks/use-transactions';
import { NaturalLanguageTransactionForm } from '@/components/features/transactions/natural-language-transaction-form';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string;
  currency: string;
  preferredFromAccountId?: string;
  preferredToAccountId?: string;
  initialAmount?: number;
  initialDate?: string;
  initialDescription?: string;
  mpesaReference?: string;
  mpesaReferenceAccountId?: string;
  receiptImageHash?: string;
  title?: string;
  onComplete?: () => void;
  allowAiEntry?: boolean;
}

export function TransferModal({
  isOpen,
  onClose,
  containerId,
  currency,
  preferredFromAccountId,
  preferredToAccountId,
  initialAmount,
  initialDate,
  initialDescription,
  mpesaReference,
  mpesaReferenceAccountId,
  receiptImageHash,
  title = 'Transfer Between Accounts',
  onComplete,
  allowAiEntry = true,
}: TransferModalProps) {
  const { data: accounts = [] } = useAccounts();
  const createTransfer = useCreateTransfer();
  const eligibleAccounts = useMemo(
    () => accounts.filter((account) => account.containerId === containerId && account.currency === currency),
    [accounts, containerId, currency],
  );
  const [fromAccountId, setFromAccountId] = useState(preferredFromAccountId ?? '');
  const [toAccountId, setToAccountId] = useState(preferredToAccountId ?? '');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [date, setDate] = useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(initialDescription ?? '');
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');

  useEffect(() => {
    if (!isOpen) return;
    setFromAccountId(preferredFromAccountId ?? '');
    setToAccountId(preferredToAccountId ?? '');
    setAmount(initialAmount ? String(initialAmount) : '');
    setDate(initialDate ?? new Date().toISOString().slice(0, 10));
    setDescription(initialDescription ?? '');
    setMode('manual');
  }, [isOpen, preferredFromAccountId, preferredToAccountId, initialAmount, initialDate, initialDescription]);

  const inputClass = 'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      showToast('error', 'Choose two different accounts', 'Select a source and destination account.');
      return;
    }
    try {
      await createTransfer.mutateAsync({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        date,
        description: description.trim(),
        mpesaReference,
        mpesaReferenceAccountId,
        receiptImageHash,
      });
      showToast('success', 'Transfer recorded', 'Both account balances have been updated.');
      if (onComplete) onComplete();
      else onClose();
    } catch (error) {
      showToast('error', 'Could not record transfer', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {allowAiEntry && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-bg-tertiary rounded-md">
            <button type="button" onClick={() => setMode('manual')} className={`py-1.5 text-sm font-medium rounded ${mode === 'manual' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}>
              Manual entry
            </button>
            <button type="button" onClick={() => setMode('ai')} className={`py-1.5 text-sm font-medium rounded ${mode === 'ai' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}>
              AI entry
            </button>
          </div>
        )}
        {mode === 'ai' && allowAiEntry ? (
          <NaturalLanguageTransactionForm
            accountId={eligibleAccounts[0]?.id ?? ''}
            currency={currency}
            containerId={containerId}
            onClose={() => { if (onComplete) onComplete(); else onClose(); }}
          />
        ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">From account</label>
          <select required value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} className={inputClass}>
            <option value="">Select source account</option>
            {eligibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">To account</label>
          <select required value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} className={inputClass}>
            <option value="">Select destination account</option>
            {eligibleAccounts.filter((account) => account.id !== fromAccountId).map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}
          </select>
        </div>
        {eligibleAccounts.length < 2 && (
          <p className="text-sm text-status-warning">You need at least two active {currency} accounts in this container to record a transfer.</p>
        )}
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Amount ({currency})</label>
          <input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Date</label>
          <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Description</label>
          <input required maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="e.g. M-Pesa cash withdrawal" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm text-fg-secondary">Cancel</button>
          <button type="submit" disabled={createTransfer.isPending || eligibleAccounts.length < 2} className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white disabled:opacity-50">
            {createTransfer.isPending ? 'Recording...' : 'Record Transfer'}
          </button>
        </div>
      </form>
        )}
      </div>
    </Modal>
  );
}
