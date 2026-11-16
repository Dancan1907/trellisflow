import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface AllocationItem {
  assetClass: string;
  value: number;
  percentage: number;
  count: number;
}

export interface AllocationReport {
  totalValue: number;
  currency: string;
  breakdown: AllocationItem[];
}

export function useAllocation() {
  return useQuery({
    queryKey: ['holdings', 'allocation'],
    queryFn: () => apiFetch<AllocationReport>('/api/holdings/allocation'),
  });
}
