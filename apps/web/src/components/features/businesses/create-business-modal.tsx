'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';
import {
  useCreateBusiness,
  type BusinessType,
  type CreateBusinessInput,
} from '@/lib/hooks/use-businesses';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'FARMING', label: 'Farming' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'OTHER', label: 'Other' },
];

const inputClass =
  'w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors';

export function CreateBusinessModal({ isOpen, onClose }: CreateBusinessModalProps) {
  const createBusiness = useCreateBusiness();
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('RETAIL');
  const [currency, setCurrency] = useState('KES');
  const [startDate, setStartDate] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setName('');
    setBusinessType('RETAIL');
    setCurrency('KES');
    setStartDate('');
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dto: CreateBusinessInput = {
      name: name.trim(),
      businessType,
      currency,
      ...(startDate ? { startDate } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      await createBusiness.mutateAsync(dto);
      showToast('success', 'Business created', `${dto.name} is ready to track.`);
      handleClose();
    } catch (error) {
      showToast(
        'error',
        'Failed to create business',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create a Business">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Business Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className={inputClass}
            placeholder="e.g., Westlands Corner Shop"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Business Type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className={inputClass}
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
            >
              <option value="KES">KES</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">
            Start Date (optional)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors resize-none"
            placeholder="What does this business do?"
          />
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
            disabled={createBusiness.isPending}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent-primary text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {createBusiness.isPending ? 'Creating…' : 'Create Business'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
