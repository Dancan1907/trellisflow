'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/api-client';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';
import { useCreateInvestmentEvent } from '@/lib/hooks/use-investment-events';

type EventType = 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST' | 'CONTRIBUTION' | 'WITHDRAWAL';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string;
  holdingId: string;
  holdingName: string;
  currency: string;
}

export function CreateEventModal({
  isOpen,
  onClose,
  containerId,
  holdingId,
  holdingName,
  currency,
}: CreateEventModalProps) {
  const [eventType, setEventType] = useState<EventType>('BUY');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [notes, setNotes] = useState('');

  const createEvent = useCreateInvestmentEvent();

  // BUY and SELL need quantity and price; DIVIDEND and INTEREST need only total amount
  const needsQuantity = eventType === 'BUY' || eventType === 'SELL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      containerId,
      holdingId,
      eventType,
      totalAmount: parseFloat(totalAmount),
      currency,
      date,
      notes: notes || undefined,
    };

    if (needsQuantity) {
      payload.quantity = parseFloat(quantity);
      payload.pricePerUnit = pricePerUnit ? parseFloat(pricePerUnit) : undefined;
    }

    try {
      await createEvent.mutateAsync(payload);
      showToast('success', 'Event recorded', `${eventType} for ${holdingName} saved.`);
      handleClose();
    } catch (err) {
      showToast('error', 'Failed to record event', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleClose = () => {
    setEventType('BUY');
    setQuantity('');
    setPricePerUnit('');
    setTotalAmount('');
    setDate(new Date().toISOString().split('T')[0]!);
    setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Record Event for ${holdingName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event type */}
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Event Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['BUY', 'SELL', 'DIVIDEND', 'INTEREST'] as EventType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEventType(type)}
                className={`h-10 rounded-md text-sm font-medium transition-colors ${
                  eventType === type
                    ? 'bg-accent-primary text-white'
                    : 'border border-border-subtle text-fg-secondary hover:bg-bg-tertiary'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity + Price (only for BUY/SELL) */}
        {needsQuantity && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Quantity</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                placeholder="e.g., 50"
                className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">
                Price per unit
              </label>
              <input
                type="number"
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="e.g., 180"
                className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>
        )}

        {/* Total amount */}
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">
            Total Amount ({currency})
          </label>
          <input
            type="number"
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
            placeholder="e.g., 9000"
            className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
          />
          {needsQuantity && quantity && pricePerUnit && (
            <p className="text-xs text-fg-tertiary mt-1">
              Suggested total: {currency}{' '}
              {(parseFloat(quantity) * parseFloat(pricePerUnit || '0')).toFixed(2)}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary resize-none"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createEvent.isPending}
            className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {createEvent.isPending ? 'Recording…' : `Record ${eventType}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
