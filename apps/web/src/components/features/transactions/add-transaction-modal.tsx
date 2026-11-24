'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateTransaction } from '@/lib/hooks/use-transactions';
import { useCategories } from '@/lib/hooks/use-categories';
import {
  MpesaParseResult,
  useConfirmMpesaTransaction,
  useParseMpesa,
} from '@/lib/hooks/use-mpesa-import';
import { showToast } from '@/components/ui/toast';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  currency: string;
  containerId?: string;
}

type TransactionKind = 'INCOME' | 'EXPENSE';

export function AddTransactionModal({
  isOpen,
  onClose,
  accountId,
  currency,
  containerId,
}: AddTransactionModalProps) {
  const createTx = useCreateTransaction();
  const parseMpesa = useParseMpesa();
  const confirmMpesa = useConfirmMpesaTransaction();
  const { data: categories } = useCategories(containerId);
  const [type, setType] = useState<TransactionKind>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'manual' | 'mpesa'>('manual');
  const [sourceMode, setSourceMode] = useState<'sms' | 'receipt'>('sms');
  const [smsText, setSmsText] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [parsed, setParsed] = useState<MpesaParseResult | null>(null);

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';
  const filteredCategories = categories?.filter((c) => c.type === type);
  const parsedCurrencyMatches = parsed?.draft.currency === currency;
  const hasDuplicate = parsed?.duplicate.detected === true;
  const isTransfer = parsed?.draft.type === 'TRANSFER';

  const handleClose = () => {
    setParsed(null);
    setSmsText('');
    setReceipt(null);
    setMode('manual');
    onClose();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
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
      handleClose();
      setAmount('');
      setDescription('');
    } catch (err) {
      showToast('error', 'Failed to save', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if (sourceMode === 'sms') {
      if (!smsText.trim()) {
        showToast('error', 'Add an M-Pesa message', 'Paste the full confirmation SMS first.');
        return;
      }
      formData.append('text', smsText.trim());
    } else {
      if (!receipt) {
        showToast('error', 'Choose a receipt', 'Select a JPG, PNG, or WebP image.');
        return;
      }
      if (receipt.size > 5 * 1024 * 1024) {
        showToast('error', 'Receipt is too large', 'The maximum image size is 5 MB.');
        return;
      }
      formData.append('receipt', receipt);
    }

    try {
      const result = await parseMpesa.mutateAsync(formData);
      setParsed(result);
      setType(result.draft.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      setAmount(String(result.draft.amount));
      setDescription(result.draft.description);
      setDate(result.draft.date);
      setCategoryId('');
    } catch (err) {
      showToast('error', 'Could not read M-Pesa item', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed || hasDuplicate || isTransfer || !parsedCurrencyMatches) return;
    try {
      await confirmMpesa.mutateAsync({
        type,
        amount: Number(amount),
        date,
        description,
        accountId,
        categoryId: categoryId || undefined,
        mpesaReference: parsed.draft.mpesaReference ?? undefined,
      });
      showToast('success', 'Transaction saved', 'The reviewed M-Pesa transaction was added.');
      handleClose();
      setAmount('');
      setDescription('');
    } catch (err) {
      showToast('error', 'Could not save transaction', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const confidenceLabel = useMemo(
    () => (parsed ? `${Math.round(parsed.draft.confidence * 100)}% confidence` : ''),
    [parsed],
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Transaction">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-bg-tertiary rounded-md">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`py-1.5 text-sm font-medium rounded ${mode === 'manual' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}
          >
            Manual entry
          </button>
          <button
            type="button"
            onClick={() => setMode('mpesa')}
            className={`py-1.5 text-sm font-medium rounded ${mode === 'mpesa' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}
          >
            Import M-Pesa
          </button>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-bg-tertiary rounded-md">
              <button type="button" onClick={() => setType('EXPENSE')} className={`py-1.5 text-sm font-medium rounded ${type === 'EXPENSE' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}>Expense</button>
              <button type="button" onClick={() => setType('INCOME')} className={`py-1.5 text-sm font-medium rounded ${type === 'INCOME' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}>Income</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">Amount ({currency})</label>
              <input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">Description</label>
              <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="e.g., Lunch at Naivas" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                <option value="">Uncategorized</option>
                {filteredCategories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">Date</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={handleClose} className="px-4 py-2 rounded-md text-sm font-medium text-fg-secondary hover:bg-bg-tertiary">Cancel</button>
              <button type="submit" disabled={createTx.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50">{createTx.isPending ? 'Saving...' : 'Save Transaction'}</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {!parsed ? (
              <form onSubmit={handleParse} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-bg-tertiary rounded-md">
                  <button type="button" onClick={() => setSourceMode('sms')} className={`py-1.5 text-sm font-medium rounded ${sourceMode === 'sms' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}>Paste SMS</button>
                  <button type="button" onClick={() => setSourceMode('receipt')} className={`py-1.5 text-sm font-medium rounded ${sourceMode === 'receipt' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}>Receipt image</button>
                </div>
                {sourceMode === 'sms' ? (
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-2">M-Pesa confirmation message</label>
                    <textarea
                      required
                      rows={6}
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
                      placeholder="Paste the complete M-Pesa SMS here..."
                    />
                    <p className="mt-1 text-xs text-fg-tertiary">The message is sent securely for extraction and is not saved as a raw message.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-fg-primary mb-2">Receipt image</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-fg-secondary file:mr-3 file:rounded-md file:border-0 file:bg-bg-tertiary file:px-3 file:py-2 file:text-fg-primary"
                    />
                    <p className="mt-1 text-xs text-fg-tertiary">JPG, PNG, or WebP · maximum 5 MB. The image is processed for extraction and is not retained.</p>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={handleClose} className="px-4 py-2 rounded-md text-sm font-medium text-fg-secondary hover:bg-bg-tertiary">Cancel</button>
                  <button type="submit" disabled={parseMpesa.isPending} className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white disabled:opacity-50">{parseMpesa.isPending ? 'Reading...' : 'Extract transaction'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirm} className="space-y-4">
                <div className="rounded-md border border-border-subtle bg-bg-tertiary p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-fg-primary">Review extracted details</p>
                    <span className="text-xs text-fg-secondary">{confidenceLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-fg-secondary">Check every field before saving. AI extraction can make mistakes.</p>
                  {parsed.draft.counterparty && <p className="mt-2 text-xs text-fg-secondary">Counterparty: {parsed.draft.counterparty}</p>}
                  {parsed.draft.mpesaReference && <p className="text-xs text-fg-secondary">M-Pesa reference: {parsed.draft.mpesaReference}</p>}
                  {parsed.draft.uncertainties.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-status-warning">{parsed.draft.uncertainties.map((item, index) => <li key={index}>{item}</li>)}</ul>}
                </div>

                {hasDuplicate && (
                  <div className="rounded-md border border-status-negative/40 bg-status-negative/5 p-3 text-sm text-status-negative">
                    This M-Pesa reference already exists in your transactions. Review the existing transaction instead of importing it again.
                  </div>
                )}
                {isTransfer && (
                  <div className="rounded-md border border-status-warning/40 bg-status-warning/5 p-3 text-sm text-fg-primary">
                    This appears to be a transfer. To keep both account balances correct, record it through the dedicated transfer form with both accounts selected.
                  </div>
                )}
                {!parsedCurrencyMatches && (
                  <div className="rounded-md border border-status-warning/40 bg-status-warning/5 p-3 text-sm text-fg-primary">
                    The receipt currency ({parsed.draft.currency}) does not match this account ({currency}). Choose an account with the matching currency before importing.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 p-1 bg-bg-tertiary rounded-md">
                  <button type="button" onClick={() => setType('EXPENSE')} className={`py-1.5 text-sm font-medium rounded ${type === 'EXPENSE' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}>Expense</button>
                  <button type="button" onClick={() => setType('INCOME')} className={`py-1.5 text-sm font-medium rounded ${type === 'INCOME' ? 'bg-bg-primary shadow-sm text-fg-primary' : 'text-fg-secondary'}`}>Income</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-2">Amount ({currency})</label>
                  <input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-2">Description</label>
                  <input type="text" maxLength={200} required value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-2">Category</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                    <option value="">Uncategorized</option>
                    {filteredCategories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-2">Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </div>
                <div className="flex justify-between gap-3 pt-2">
                  <button type="button" onClick={() => setParsed(null)} className="px-3 py-2 rounded-md text-sm text-fg-secondary hover:bg-bg-tertiary">Try another item</button>
                  <button type="submit" disabled={confirmMpesa.isPending || hasDuplicate || isTransfer || !parsedCurrencyMatches} className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white disabled:opacity-50">{confirmMpesa.isPending ? 'Saving...' : 'Confirm and save'}</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
