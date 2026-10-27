import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: number;
  remaining: number;
  percentage: number;
  currency: string;
}

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: () => apiFetch<Goal[]>('/api/goals') });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      targetAmount,
      name,
    }: {
      id: string;
      targetAmount?: number;
      name?: string;
    }) =>
      apiFetch<Goal>(`/api/goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ targetAmount, name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
