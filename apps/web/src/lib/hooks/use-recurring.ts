import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface RecurringRule {
  id: string;
  description: string;
  amount: string;
  currency: string;
  frequency: string;
  nextOccurrence: string;
  status: 'ACTIVE' | 'PAUSED';
  type: 'INCOME' | 'EXPENSE';
}

export function useRecurringRules() {
  return useQuery({
    queryKey: ['recurring-rules'],
    queryFn: () => apiFetch<RecurringRule[]>('/api/recurring-rules'),
  });
}

export function useUpcomingBills() {
  return useQuery({
    queryKey: ['recurring-rules', 'upcoming'],
    queryFn: () => apiFetch<RecurringRule[]>('/api/recurring-rules/upcoming?days=30'),
  });
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<RecurringRule>('/api/recurring-rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-rules'] }),
  });
}

export function useUpdateRecurringRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; description?: string }) =>
      apiFetch<any>(`/api/recurring-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-rules'] }),
  });
}

export function useToggleRuleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' }) =>
      apiFetch<any>(`/api/recurring-rules/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-rules'] }),
  });
}
