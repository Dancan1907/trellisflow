'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/api-client';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';

interface Container {
  id: string;
  name: string;
  type: string;
}

interface Account {
  id: string;
  name: string;
  containerId: string;
}

interface CreateHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  containers: Container[];
  accounts: Account[];
}

export function CreateHoldingModal({
  isOpen,
  onClose,
  containers,
  accounts,
}: CreateHoldingModalProps) {
  const queryClient = useQueryClient();

  // Only show INVESTMENT containers
  const investmentContainers = containers.filter((c) => c.type === 'INVESTMENT');

  const [containerId, setContainerId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState('STOCK');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costBasisTotal, setCostBasisTotal] = useState('');
  const [currentValueTotal, setCurrentValueTotal] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [notes, setNotes] = useState('');

  // Auto-select the first investment container + its first account
  useEffect(() => {
    if (isOpen && investmentContainers.length > 0 && !containerId) {
      const firstContainer = investmentContainers[0]!;
      setContainerId(firstContainer.id);
      const containerAccounts = accounts.filter((a) => a.containerId === firstContainer.id);
      if (containerAccounts.length > 0) {
        setAccountId(containerAccounts[0]!.id);
      }
    }
  }, [isOpen, investmentContainers, accounts, containerId]);

  const availableAccounts = accounts.filter((a) => a.containerId === containerId);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>('/api/holdings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      showToast('success', 'Holding created', `${name} has been added to your portfolio.`);
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['holdings', 'allocation'] });
      handleClose();
    },
    onError: (error) => {
      showToast(
        'error',
        'Failed to create holding',
        error instanceof Error ? error.message : 'Error',
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerId || !accountId) {
      showToast('error', 'Please select a container and account');
      return;
    }

    mutation.mutate({
      containerId,
      accountId,
      name,
      assetClass,
      symbol: symbol || undefined,
      quantity: parseFloat(quantity),
      costBasisTotal: parseFloat(costBasisTotal),
      currentValueTotal: parseFloat(currentValueTotal),
      currency,
      notes: notes || undefined,
    });
  };

  const handleClose = () => {
    setName('');
    setSymbol('');
    setQuantity('');
    setCostBasisTotal('');
    setCurrentValueTotal('');
    setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add a Holding">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Container</label>
          <select
            value={containerId}
            onChange={(e) => {
              setContainerId(e.target.value);
              const newAccounts = accounts.filter((a) => a.containerId === e.target.value);
              setAccountId(newAccounts[0]?.id ?? '');
            }}
            required
            className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
          >
            <option value="">Select container</option>
            {investmentContainers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
          >
            <option value="">Select account</option>
            {availableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g., Safaricom Stock"
            className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Asset Class</label>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="STOCK">Stock</option>
              <option value="ETF">ETF</option>
              <option value="CRYPTO">Crypto</option>
              <option value="REAL_ESTATE">Real Estate</option>
              <option value="BOND">Bond</option>
              <option value="COLLECTIBLE">Collectible</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">
              Symbol (optional)
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g., SCOM"
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Quantity</label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Total Cost</label>
            <input
              type="number"
              step="0.01"
              value={costBasisTotal}
              onChange={(e) => setCostBasisTotal(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-1">Current Value</label>
            <input
              type="number"
              step="0.01"
              value={currentValueTotal}
              onChange={(e) => setCurrentValueTotal(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
          >
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg-primary mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary resize-none"
          />
        </div>

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
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating…' : 'Create Holding'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
