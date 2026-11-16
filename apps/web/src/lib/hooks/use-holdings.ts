import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

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
