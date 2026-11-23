'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useAddContribution } from '@/lib/hooks/use-goals';
import { showToast } from '@/components/ui/toast';

interface AddContributionModalProps {
  goal: { id: string; name: string; currency: string } | null;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function AddContributionModal({ goal, onClose }: AddContributionModalProps) {
  const addContribution = useAddContribution();

  const [mode, setMode] = useState<'add' | 'withdraw'>('add');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');

  const reset = () => {
    setMode('add');
    setAmount('');
    setDate(today());
    setNote('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal) return;

    const value = parseFloat(amount);
    if (!value || value <= 0) return;

    try {
      await addContribution.mutateAsync({
        id: goal.id,
        amount: mode === 'add' ? value : -value,
        date,
        note: note.trim() || undefined,
      });
      showToast(
        'success',
        mode === 'add' ? 'Money added' : 'Withdrawal recorded',
        `Your "${goal.name}" goal has been updated.`,
      );
      handleClose();
    } catch (err) {
      showToast('error', 'Failed to save', err instanceof Error ? err.message : 'Error');
    }
  };

  const inputClass =
    'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';

  return (
    <Modal isOpen={!!goal} onClose={handleClose} title={`Update "${goal?.name ?? ''}"`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          {(['add', 'withdraw'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                mode === m
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'border-border-subtle text-fg-secondary hover:bg-bg-tertiary'
              }`}
            >
              {m === 'add' ? 'Add money' : 'Withdraw'}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">
            Amount ({goal?.currency ?? 'KES'})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Date</label>
          <input
            type="date"
            required
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-2">Note (Optional)</label>
          <input
            type="text"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            placeholder="e.g., November savings"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-fg-secondary hover:bg-bg-tertiary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={addContribution.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {addContribution.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
