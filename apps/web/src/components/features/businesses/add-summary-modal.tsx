'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';
import { useCreateSummary, type CreateSummaryInput } from '@/lib/hooks/use-summaries';

interface AddSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
}

const inputClass =
  'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';

export function AddSummaryModal({ isOpen, onClose, businessId, currency }: AddSummaryModalProps) {
  const createSummary = useCreateSummary(businessId);
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [unit, setUnit] = useState('');
  const [cashBalance, setCashBalance] = useState('');
  const [assetsValue, setAssetsValue] = useState('');
  const [liabilitiesValue, setLiabilitiesValue] = useState('');
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setDate(today);
    setUnit('');
    setCashBalance('');
    setAssetsValue('');
    setLiabilitiesValue('');
    setIncome('');
    setExpenses('');
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dto: CreateSummaryInput = {
      date,
      currency,
      cashBalance: Number(cashBalance),
      assetsValue: Number(assetsValue),
      liabilitiesValue: Number(liabilitiesValue),
      income: Number(income) || 0,
      expenses: Number(expenses) || 0,
      ...(unit.trim() ? { unit: unit.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      await createSummary.mutateAsync(dto);
      showToast('success', 'Summary recorded', 'The manual summary has been saved.');
      handleClose();
    } catch (error) {
      showToast(
        'error',
        'Failed to record summary',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Manual Summary">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Unit (Optional)
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. Farm #47"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Cash Balance ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              value={cashBalance}
              onChange={(e) => setCashBalance(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Assets Value ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              value={assetsValue}
              onChange={(e) => setAssetsValue(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Liabilities ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              value={liabilitiesValue}
              onChange={(e) => setLiabilitiesValue(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Income ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Expenses ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createSummary.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {createSummary.isPending ? 'Saving…' : 'Save Summary'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
