import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface NetWorthTrend {
  date: string;
  totalNetWorth: string;
}

export interface CashFlowData {
  period: { from: string; to: string };
  income: number;
  expenses: number;
  net: number;
}

export interface AllocationData {
  total: string;
  breakdown: {
    personal: string;
    investments: string;
    businesses: string;
  };
}

export function useNetWorthTrend(days = 30) {
  return useQuery({
    queryKey: ['reports', 'net-worth', days],
    queryFn: () => apiFetch<NetWorthTrend[]>(`/api/reports/net-worth?days=${days}`),
  });
}

export function useCashFlow(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'cash-flow', from, to],
    queryFn: () => apiFetch<CashFlowData>(`/api/reports/cash-flow?from=${from}&to=${to}`),
  });
}

export function useAllocation() {
  return useQuery({
    queryKey: ['reports', 'allocation'],
    queryFn: () => apiFetch<AllocationData>('/api/reports/allocation'),
  });
}
