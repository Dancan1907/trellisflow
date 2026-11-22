import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/api-client';

export interface Holding {
  id: string;
  containerId: string;
  accountId: string;
  name: string;
  assetClass: string;
  symbol: string | null;
  quantity: string;
  costBasisTotal: string;
  currentValueTotal: string;
  currency: string;
  status: 'OPEN' | 'CLOSED' | 'DELETED';
  acquiredDate: string | null;
  pricingMode: string;
  notes: string | null;
}

export interface QueryHoldingsFilters {
  containerId?: string;
  assetClass?: string;
  status?: string;
  search?: string;
}

export function useHoldings(filters: QueryHoldingsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.containerId) params.set('containerId', filters.containerId);
  if (filters.assetClass) params.set('assetClass', filters.assetClass);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  const queryString = params.toString();
  const path = queryString ? `/api/holdings?${queryString}` : '/api/holdings';

  return useQuery({
    queryKey: ['holdings', filters],
    queryFn: () => apiFetch<Holding[]>(path),
  });
}

export function useHolding(id: string) {
  return useQuery({
    queryKey: ['holdings', id],
    queryFn: () => apiFetch<Holding>(`/api/holdings/${id}`),
    enabled: !!id,
  });
}

export function useSetHoldingPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      pricingMode,
      providerSymbol,
      priceProvider,
    }: {
      id: string;
      pricingMode: 'MANUAL' | 'AUTO';
      providerSymbol?: string;
      priceProvider?: string;
    }) =>
      apiFetch(`/api/holdings/${id}/pricing`, {
        method: 'PATCH',
        body: JSON.stringify({ pricingMode, providerSymbol, priceProvider }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] });
      qc.invalidateQueries({ queryKey: ['allocation'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRefreshHoldingPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ updated: boolean; price?: number; provider?: string; error?: string }>(
        `/api/holdings/${id}/refresh-price`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holdings'] });
      qc.invalidateQueries({ queryKey: ['holding'] });
      qc.invalidateQueries({ queryKey: ['allocation'] });
    },
  });
}
