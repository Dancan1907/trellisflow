'use client';

import { useMemo, useState } from 'react';
import { showToast } from '@/components/ui/toast';
import {
  NaturalLanguageDraftResult,
  useConfirmNaturalLanguageDraft,
  useCreateNaturalLanguageDraft,
} from '@/lib/hooks/use-natural-language-drafts';

interface NaturalLanguageTransactionFormProps {
  accountId: string;
  currency: string;
  containerId?: string;
  onClose: () => void;
}

export function NaturalLanguageTransactionForm({
  accountId,
  currency,
  containerId,
  onClose,
}: NaturalLanguageTransactionFormProps) {
  const createDraft = useCreateNaturalLanguageDraft();
  const confirmDraft = useConfirmNaturalLanguageDraft();
  const [text, setText] = useState('');
  const [result, setResult] = useState<NaturalLanguageDraftResult | null>(null);
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accountId);
  const [categoryId, setCategoryId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';

  const accounts = result?.options.accounts ?? [];
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const transferContainerId =
    containerId ?? accounts.find((account) => account.id === accountId)?.containerId;
  const transferCurrency = selectedAccount?.currency ?? currency;
  const transferAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.containerId === transferContainerId && account.currency === transferCurrency,
      ),
    [accounts, transferContainerId, transferCurrency],
  );
  const categories = result?.options.categories.filter(
    (category) =>
      category.type === type &&
      (!category.containerId || category.containerId === selectedAccount?.containerId),
  ) ?? [];

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (text.trim().length < 3) {
      showToast('error', 'Describe the transaction', 'Enter at least 3 characters.');
      return;
    }
    try {
      const draft = await createDraft.mutateAsync(text.trim());
      setResult(draft);
      setType(draft.draft.type);
      setAmount(String(draft.draft.amount));
      setDate(draft.draft.date);
      setDescription(draft.draft.description);
      setSelectedAccountId(draft.draft.accountId ?? accountId);
      setCategoryId(draft.draft.categoryId ?? '');
      setFromAccountId(draft.draft.fromAccountId ?? '');
      setToAccountId(draft.draft.toAccountId ?? '');
    } catch (error) {
      showToast(
        'error',
        'Could not create transaction draft',
        error instanceof Error ? error.message : 'Please rephrase and try again.',
      );
    }
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!result || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return;

    try {
      if (type === 'TRANSFER') {
        if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
          showToast('error', 'Choose two different accounts', 'Select a source and destination account.');
          return;
        }
        await confirmDraft.mutateAsync({
          type: 'TRANSFER',
          transaction: {
            fromAccountId,
            toAccountId,
            amount: Number(amount),
            date,
            description: description.trim(),
            notes: result.draft.notes ?? undefined,
          },
        });
      } else {
        if (!selectedAccountId) {
          showToast('error', 'Choose an account', 'Select the account for this transaction.');
          return;
        }
        await confirmDraft.mutateAsync({
          type,
          transaction: {
            type,
            amount: Number(amount),
            date,
            description: description.trim(),
            accountId: selectedAccountId,
            categoryId: categoryId || undefined,
            notes: result.draft.notes ?? undefined,
          },
        });
      }
      showToast('success', 'Transaction saved', 'Your transaction has been recorded.');
      onClose();
    } catch (error) {
      showToast(
        'error',
        'Could not save transaction',
        error instanceof Error ? error.message : 'Please review the details and try again.',
      );
    }
  };

  if (!result) {
    return (
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">
            Describe what happened
          </label>
          <textarea
            required
            minLength={3}
            maxLength={2000}
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary"
            placeholder="e.g. I spent KSh 850 on lunch today using M-Pesa."
          />
          <p className="mt-1 text-xs text-fg-tertiary">
            Describe one income, expense, or transfer. TrellisFlow will prepare a draft for you to review; nothing is saved yet.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm text-fg-secondary hover:bg-bg-tertiary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createDraft.isPending || text.trim().length < 3}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white disabled:opacity-50"
          >
            {createDraft.isPending ? 'Understanding...' : 'Create draft'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-4">
      <div className="rounded-md border border-border-subtle bg-bg-tertiary p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-fg-primary">Review AI-generated draft</p>
          <span className="text-xs text-fg-secondary">
            {Math.round(result.draft.confidence * 100)}% confidence
          </span>
        </div>
        <p className="mt-1 text-xs text-fg-secondary">
          Check and correct every field. No transaction is saved until you confirm.
        </p>
        {result.draft.uncertainties.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-xs text-status-warning">
            {result.draft.uncertainties.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary mb-2">Transaction type</label>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className={inputClass}
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
          <option value="TRANSFER">Transfer</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary mb-2">
          Amount ({type === 'TRANSFER' ? transferCurrency : selectedAccount?.currency ?? currency})
        </label>
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={inputClass}
        />
      </div>

      {type === 'TRANSFER' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">From account</label>
            <select required value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} className={inputClass}>
              <option value="">Select source account</option>
              {transferAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">To account</label>
            <select required value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} className={inputClass}>
              <option value="">Select destination account</option>
              {transferAccounts.filter((account) => account.id !== fromAccountId).map((account) => (
                <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>
              ))}
            </select>
          </div>
          {transferAccounts.length < 2 && (
            <p className="text-xs text-status-warning">
              At least two active accounts in the same container and currency are required for a transfer.
            </p>
          )}
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">Account</label>
            <select
              required
              value={selectedAccountId}
              onChange={(event) => {
                setSelectedAccountId(event.target.value);
                setCategoryId('');
              }}
              className={inputClass}
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">Category</label>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-fg-primary mb-2">Description</label>
        <input
          required
          maxLength={200}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-fg-primary mb-2">Date</label>
        <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
      </div>

      <div className="flex justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setResult(null)}
          className="px-3 py-2 rounded-md text-sm text-fg-secondary hover:bg-bg-tertiary"
        >
          Try another sentence
        </button>
        <button
          type="submit"
          disabled={
            confirmDraft.isPending ||
            (type === 'TRANSFER'
              ? transferAccounts.length < 2 || !fromAccountId || !toAccountId || fromAccountId === toAccountId
              : !selectedAccountId)
          }
          className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white disabled:opacity-50"
        >
          {confirmDraft.isPending ? 'Saving...' : 'Confirm and save'}
        </button>
      </div>
    </form>
  );
}
