'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';
import { useConvertBusinessToExternal } from '@/lib/hooks/use-businesses';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  onConverted: () => void;
}

export function ConvertToExternalModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  onConverted,
}: Props) {
  const [confirmText, setConfirmText] = useState('');
  const convert = useConvertBusinessToExternal();
  const expected = businessName.trim();
  const canSubmit = confirmText.trim() === expected && !convert.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const result = await convert.mutateAsync({ id: businessId });
      showToast(
        'success',
        'Converted to external',
        `${businessName} now tracks summaries. A seed summary of ${result.seedSummary.currency} ${result.seedSummary.netWorth.toLocaleString()} was created.`,
      );
      setConfirmText('');
      onConverted();
      onClose();
    } catch (error) {
      showToast(
        'error',
        'Conversion failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert to External Business">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-md bg-status-warning/10 border border-status-warning/30">
          <AlertTriangle size={20} className="text-status-warning shrink-0 mt-0.5" />
          <div className="text-sm text-fg-primary space-y-1">
            <p className="font-medium">This action is one-way and cannot be undone.</p>
            <ul className="list-disc list-inside text-fg-secondary space-y-1 text-xs">
              <li>Business accounts will be archived (transactions preserved).</li>
              <li>P&amp;L and runway will no longer be available.</li>
              <li>
                A seed summary is created from today&apos;s net worth so your trend stays
                continuous.
              </li>
              <li>You&apos;ll add future data via manual summaries or the API.</li>
            </ul>
          </div>
        </div>

        <div>
          <label className="block text-sm text-fg-secondary mb-1">
            Type <span className="font-mono text-fg-primary">{expected}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-bg-secondary border border-border-subtle text-fg-primary text-sm focus:outline-none focus:border-accent-primary"
            placeholder={expected}
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={convert.isPending}
            className="px-4 py-2 rounded-md border border-border-subtle text-sm text-fg-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-md bg-status-warning text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {convert.isPending ? 'Converting…' : 'Convert to External'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
