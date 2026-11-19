'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';
import {
  useCorrectSummary,
  useSummaryVersions,
  type SerializedSummary,
} from '@/lib/hooks/use-summaries';

interface CorrectSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  summary: SerializedSummary;
}

const inputClass =
  'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';

export function CorrectSummaryModal({
  isOpen,
  onClose,
  businessId,
  summary,
}: CorrectSummaryModalProps) {
  const correctSummary = useCorrectSummary(businessId);
  const { data: versions, isLoading: versionsLoading } = useSummaryVersions(summary.id);
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');

  // Initialize state with the current summary values
  const [cashBalance, setCashBalance] = useState(summary.cashBalance.toString());
  const [assetsValue, setAssetsValue] = useState(summary.assetsValue.toString());
  const [liabilitiesValue, setLiabilitiesValue] = useState(summary.liabilitiesValue.toString());
  const [income, setIncome] = useState(summary.income.toString());
  const [expenses, setExpenses] = useState(summary.expenses.toString());
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      showToast('error', 'Reason required', 'Please provide a reason for this correction.');
      return;
    }

    try {
      await correctSummary.mutateAsync({
        summaryId: summary.id,
        reason: reason.trim(),
        cashBalance: Number(cashBalance),
        assetsValue: Number(assetsValue),
        liabilitiesValue: Number(liabilitiesValue),
        income: Number(income),
        expenses: Number(expenses),
      });
      showToast('success', 'Summary corrected', 'The previous values have been saved in history.');
      onClose();
    } catch (error) {
      showToast(
        'error',
        'Failed to correct summary',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Correct Summary (${summary.date})`}
      className="max-w-2xl"
    >
      {/* Tabs */}
      <div className="flex border-b border-border-subtle mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'edit'
              ? 'border-accent-primary text-accent-primary'
              : 'border-transparent text-fg-secondary hover:text-fg-primary'
          }`}
        >
          Edit Values
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-accent-primary text-accent-primary'
              : 'border-transparent text-fg-secondary hover:text-fg-primary'
          }`}
        >
          Version History ({versions?.length ?? 0})
        </button>
      </div>

      {activeTab === 'edit' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-status-warning/10 text-status-warning text-sm p-3 rounded-md mb-4">
            Note: Correcting this summary will preserve the old values as a version.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">
                Cash Balance ({summary.currency})
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
                Assets Value ({summary.currency})
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
                Liabilities ({summary.currency})
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
                Income ({summary.currency})
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

          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Expenses ({summary.currency})
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
              Reason for Correction <span className="text-status-negative">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className={inputClass}
              placeholder="e.g. Miscounted the harvest"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={correctSummary.isPending}
              className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {correctSummary.isPending ? 'Saving…' : 'Save Correction'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {versionsLoading ? (
            <p className="text-sm text-fg-secondary">Loading history...</p>
          ) : !versions || versions.length === 0 ? (
            <p className="text-sm text-fg-secondary">
              No corrections have been made to this summary yet.
            </p>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="bg-bg-tertiary/50 p-4 rounded-md border border-border-subtle"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-fg-primary">
                      Version {v.versionNumber}
                    </span>
                    <span className="text-xs text-fg-secondary">
                      {new Date(v.editedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-fg-primary mb-1">
                    <span className="text-fg-secondary">Reason:</span> {v.reason}
                  </p>
                  <p className="text-xs text-fg-secondary mb-2">
                    Edited by {v.editor.name || v.editor.email}
                  </p>
                  {/* Optionally render a diff of v.snapshot vs current here */}
                  <div className="text-xs text-fg-tertiary font-mono bg-bg-primary p-2 rounded">
                    Prev Net Worth: {summary.currency}{' '}
                    {Number(v.snapshot.assetsValue) - Number(v.snapshot.liabilitiesValue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
