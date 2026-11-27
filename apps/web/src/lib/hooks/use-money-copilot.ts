import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface MoneyCopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useMoneyCopilotChat() {
  return useMutation({
    mutationFn: (input: { message: string; history: MoneyCopilotMessage[] }) =>
      apiFetch<{ answer: string; readOnly: true; asOf: string | null }>(
        '/api/money-copilot/chat',
        { method: 'POST', body: JSON.stringify(input) },
      ),
  });
}


export interface MoneyCopilotActionPreviewInput {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  accountId: string;
  categoryId?: string;
  date: string;
  description: string;
  notes?: string;
}

export interface MoneyCopilotActionPreview {
  actionId: string;
  status: 'PENDING';
  expiresAt: string;
  preview: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    currency: string;
    account: string;
    accountId: string;
    categoryId: string | null;
    category: string | null;
    date: string;
    description: string;
    notes: string | null;
  };
  requiresExplicitConfirmation: true;
}

export function useMoneyCopilotActionPreview() {
  return useMutation({
    mutationFn: (input: MoneyCopilotActionPreviewInput) =>
      apiFetch<MoneyCopilotActionPreview>('/api/money-copilot/actions/preview', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

export function useConfirmMoneyCopilotAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) =>
      apiFetch<{ status: 'CONFIRMED'; transaction: { id: string }; replayed: boolean }>(
        '/api/money-copilot/actions/confirm',
        { method: 'POST', body: JSON.stringify({ actionId }) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['net-worth'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
  });
}
