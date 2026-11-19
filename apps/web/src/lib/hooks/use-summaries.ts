import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface SerializedSummary {
  id: string;
  containerId: string;
  unit: string | null;
  date: string;
  period: string;
  periodStart: string | null;
  periodEnd: string | null;
  income: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
  cashBalance: number;
  assetsValue: number;
  liabilitiesValue: number;
  netWorth: number;
  currency: string;
  notes: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  versionCount?: number;
}

export interface CreateSummaryInput {
  date: string;
  currency: string;
  cashBalance: number;
  assetsValue: number;
  liabilitiesValue: number;
  income?: number;
  expenses?: number;
  transfersIn?: number;
  transfersOut?: number;
  unit?: string;
  notes?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface SummaryVersion {
  id: string;
  versionNumber: number;
  snapshot: any;
  editedAt: string;
  reason: string | null;
  editor: { id: string; name: string; email: string };
}

export function useSummaries(businessId: string) {
  return useQuery({
    queryKey: ['summaries', businessId],
    queryFn: () =>
      apiFetch<{ items: SerializedSummary[]; total: number }>(
        `/api/businesses/${businessId}/summaries`,
      ),
    enabled: !!businessId,
  });
}

export function useCreateSummary(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSummaryInput) =>
      apiFetch<SerializedSummary>(`/api/businesses/${businessId}/summaries`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries', businessId] });
      queryClient.invalidateQueries({ queryKey: ['businesses', businessId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCorrectSummary(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      summaryId,
      ...dto
    }: { summaryId: string; reason: string } & Partial<CreateSummaryInput>) =>
      apiFetch<SerializedSummary>(`/api/summaries/${summaryId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries', businessId] });
      queryClient.invalidateQueries({ queryKey: ['businesses', businessId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSummaryVersions(summaryId: string) {
  return useQuery({
    queryKey: ['summaries', 'versions', summaryId],
    queryFn: () => apiFetch<SummaryVersion[]>(`/api/summaries/${summaryId}/versions`),
    enabled: !!summaryId,
  });
}
