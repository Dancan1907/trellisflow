import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface MpesaExtractionDraft {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'UNSUPPORTED';
  amount: number;
  currency: string;
  date: string;
  description: string;
  counterparty: string | null;
  mpesaReference: string | null;
  confidence: number;
  uncertainties: string[];
}

export interface MpesaParseResult {
  draft: MpesaExtractionDraft;
  duplicate:
    | { detected: false }
    | {
        detected: true;
        transactionId: string;
        date: string;
        amount: string;
        description: string;
      };
  requiresReview: true;
  canAutoSave: false;
}

export interface ConfirmMpesaTransaction {
  type: 'INCOME' | 'EXPENSE';
  currency: string;
  amount: number;
  date: string;
  description: string;
  accountId: string;
  categoryId?: string;
  mpesaReference?: string;
}

export function useParseMpesa() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<MpesaParseResult>('/api/mpesa-import/parse', {
        method: 'POST',
        body: formData,
      }),
  });
}

export function useConfirmMpesaTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfirmMpesaTransaction) =>
      apiFetch('/api/mpesa-import/confirm', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
