import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export type EventType = 'BUY' | 'SELL' | 'DIVIDEND' | 'CONTRIBUTION' | 'WITHDRAWAL';

export interface InvestmentEvent {
  id: string;
  eventType: EventType;
  quantity: string | null;
  pricePerUnit: string | null;
  totalAmount: string;
  realizedGain: string | null;
  date: string;
  notes: string | null;
}

export function useInvestmentEvents(holdingId: string) {
  return useQuery({
    queryKey: ['investment-events', holdingId],
    queryFn: () => apiFetch<InvestmentEvent[]>(`/api/investment-events/by-holding/${holdingId}`),
    enabled: !!holdingId,
  });
}

export function useCreateInvestmentEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<InvestmentEvent>('/api/investment-events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investment-events', variables.holdingId] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] }); // Refresh holding quantity
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Refresh dashboard totals
    },
  });
}

export function useDeleteInvestmentEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; holdingId: string }) =>
      apiFetch<void>(`/api/investment-events/${id}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investment-events', variables.holdingId] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}
