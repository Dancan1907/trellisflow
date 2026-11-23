import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface DebtPlan {
  id: string;
  accountId: string;
  method: 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM';
  minimumPayment: string;
  interestRate: string;
  extraMonthlyPayment: string;
  notes: string | null;
  status: string;
  account: {
    id: string;
    name: string;
    currentBalance: string;
    currency: string;
  };
}

export interface SimulationResult {
  monthsToPayoff: number;
  payoffDate: string;
  totalInterestPaid: number;
  monthlyExtra: number;
  method: 'SNOWBALL' | 'AVALANCHE';
  history: Array<{ month: number; totalBalance: number }>;
}

export interface CreateDebtInput {
  accountId: string;
  minimumPayment: number;
  interestRate: number;
  method?: 'SNOWBALL' | 'AVALANCHE';
  notes?: string;
}

export function useDebts() {
  return useQuery({
    queryKey: ['debts'],
    queryFn: () => apiFetch<DebtPlan[]>('/api/debts'),
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDebtInput) =>
      apiFetch<DebtPlan>('/api/debts', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/debts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useSimulateDebt() {
  return useMutation({
    mutationFn: (dto: { extraMonthlyPayment: number; method: 'SNOWBALL' | 'AVALANCHE' }) =>
      apiFetch<SimulationResult>('/api/debts/simulate', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  });
}
