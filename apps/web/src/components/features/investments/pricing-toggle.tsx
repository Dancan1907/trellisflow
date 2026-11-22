'use client';

import { useState } from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import { useSetHoldingPricing, useRefreshHoldingPrice } from '@/lib/hooks/use-holdings';
import { showToast } from '@/components/ui/toast';

const AUTO_ALLOWED = new Set(['STOCK', 'ETF', 'CRYPTO']);

const PROVIDERS_BY_CLASS: Record<string, { value: string; label: string }[]> = {
  STOCK: [
    { value: 'alpha_vantage', label: 'Alpha Vantage' },
    { value: 'finnhub', label: 'Finnhub' },
  ],
  ETF: [
    { value: 'alpha_vantage', label: 'Alpha Vantage' },
    { value: 'finnhub', label: 'Finnhub' },
  ],
  CRYPTO: [{ value: 'coingecko', label: 'CoinGecko' }],
};

interface Props {
  holding: {
    id: string;
    assetClass: string;
    pricingMode: 'MANUAL' | 'AUTO';
    providerSymbol: string | null;
    priceProvider: string | null;
    lastPricedAt: string | null;
  };
}

export function PricingToggle({ holding }: Props) {
  const enabled = AUTO_ALLOWED.has(holding.assetClass);
  const [mode, setMode] = useState(holding.pricingMode);
  const [providerSymbol, setProviderSymbol] = useState(holding.providerSymbol ?? '');
  const [priceProvider, setPriceProvider] = useState(holding.priceProvider ?? '');

  const setPricing = useSetHoldingPricing();
  const refresh = useRefreshHoldingPrice();

  if (!enabled) {
    return (
      <div className="rounded-md border border-border-subtle p-3 text-xs text-fg-secondary">
        Auto-pricing is not available for {holding.assetClass.replace(/_/g, ' ').toLowerCase()}.
        Update the value manually.
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await setPricing.mutateAsync({
        id: holding.id,
        pricingMode: mode,
        providerSymbol: mode === 'AUTO' ? providerSymbol : undefined,
        priceProvider: mode === 'AUTO' ? priceProvider : undefined,
      });
      showToast('success', 'Pricing updated');
    } catch (err) {
      showToast('error', 'Update failed', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleRefreshNow = async () => {
    try {
      const result = await refresh.mutateAsync(holding.id);
      if (result.updated) {
        showToast('success', 'Price refreshed', `New price via ${result.provider}`);
      } else {
        showToast('error', 'Refresh failed', result.error ?? 'Unknown error');
      }
    } catch (err) {
      showToast('error', 'Refresh failed', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border-subtle p-4">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-accent-primary" />
        <p className="text-sm font-medium text-fg-primary">Auto-pricing</p>
      </div>

      <div className="flex gap-2">
        {(['MANUAL', 'AUTO'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              mode === m
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'border-border-subtle text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'AUTO' && (
        <>
          <label className="block text-xs text-fg-secondary">
            Ticker / provider id
            <input
              type="text"
              value={providerSymbol}
              onChange={(e) => setProviderSymbol(e.target.value)}
              placeholder={holding.assetClass === 'CRYPTO' ? 'e.g. bitcoin' : 'e.g. AAPL'}
              className="mt-1 w-full px-3 py-2 rounded-md bg-bg-secondary border border-border-subtle text-sm text-fg-primary"
            />
          </label>

          <label className="block text-xs text-fg-secondary">
            Preferred provider
            <select
              value={priceProvider}
              onChange={(e) => setPriceProvider(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md bg-bg-secondary border border-border-subtle text-sm text-fg-primary"
            >
              <option value="">Auto (recommended)</option>
              {PROVIDERS_BY_CLASS[holding.assetClass]?.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={handleSave}
          disabled={setPricing.isPending}
          className="px-3 py-1.5 rounded-md bg-accent-primary text-white text-xs font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {setPricing.isPending ? 'Saving…' : 'Save'}
        </button>

        {mode === 'AUTO' && holding.pricingMode === 'AUTO' && (
          <button
            onClick={handleRefreshNow}
            disabled={refresh.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-subtle text-xs text-fg-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
            {refresh.isPending ? 'Refreshing…' : 'Refresh now'}
          </button>
        )}
      </div>

      {holding.lastPricedAt && (
        <p className="text-xs text-fg-tertiary">
          Last priced: {new Date(holding.lastPricedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
