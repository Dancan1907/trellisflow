import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface Budget {
  id: string;
  categoryId: string;
  amount: string;
  spent: number;
  remaining: number;
  percentage: number;
  currency: string;
  container: { name: string };
}

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiFetch<Budget[]>('/api/budgets'),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<Budget>('/api/budgets', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
