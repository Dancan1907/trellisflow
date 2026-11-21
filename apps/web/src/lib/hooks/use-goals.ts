import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export type ProjectionStatus = 'ACHIEVED' | 'ON_TRACK' | 'BEHIND' | 'NO_TARGET_DATE' | 'NO_DATA';

export interface GoalProjection {
  status: ProjectionStatus;
  dailyRate: number;
  projectedCompletionDate: string | null;
  /** Positive = ahead of target date, negative = late. */
  daysAhead: number | null;
  requiredMonthly: number | null;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: number;
  remaining: number;
  percentage: number;
  currency: string;
  targetDate: string | null;
  linkedAccountId: string | null;
  projection: GoalProjection;
}

export interface GoalHistoryPoint {
  date: string;
  amount: number;
}

export interface GoalHistory {
  mode: 'linked' | 'manual';
  targetAmount: number;
  currentAmount: number;
  history: GoalHistoryPoint[];
  projection: GoalProjection;
}

export interface AddContributionInput {
  id: string;
  amount: number; // negative = withdrawal
  date?: string;
  note?: string;
}

function invalidateGoalData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['goals'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['insights'] });
}

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: () => apiFetch<Goal[]>('/api/goals') });
}

export function useGoalHistory(id: string, enabled = true) {
  return useQuery({
    queryKey: ['goals', id, 'history'],
    queryFn: () => apiFetch<GoalHistory>(`/api/goals/${id}/history`),
    enabled: enabled && !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => invalidateGoalData(queryClient),
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
    onSuccess: () => invalidateGoalData(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateGoalData(queryClient),
  });
}

export function useAddContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: AddContributionInput) => {
      const result = await apiFetch<unknown>(`/api/goals/${id}/contributions`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      // Best-effort: surface milestone / behind-schedule alerts immediately
      try {
        await apiFetch<unknown>('/api/insights/generate', { method: 'POST' });
      } catch {
        /* alerts will be picked up on the next generation run */
      }
      return result;
    },
    onSuccess: () => invalidateGoalData(queryClient),
  });
}
