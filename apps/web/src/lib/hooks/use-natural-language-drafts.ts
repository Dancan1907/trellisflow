import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface NaturalLanguageAccountOption {
  id: string;
  name: string;
  currency: string;
  containerId: string;
}

export interface NaturalLanguageCategoryOption {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  containerId: string | null;
}

export interface NaturalLanguageDraftResult {
  draft: {
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount: number;
    date: string;
    description: string;
    accountHint: string | null;
    categoryHint: string | null;
    fromAccountHint: string | null;
    toAccountHint: string | null;
    notes: string | null;
    confidence: number;
    uncertainties: string[];
    accountId: string | null;
    fromAccountId: string | null;
    toAccountId: string | null;
    categoryId: string | null;
  };
  options: {
    accounts: NaturalLanguageAccountOption[];
    categories: NaturalLanguageCategoryOption[];
    accountCandidates: NaturalLanguageAccountOption[];
    fromAccountCandidates: NaturalLanguageAccountOption[];
    toAccountCandidates: NaturalLanguageAccountOption[];
    categoryCandidates: NaturalLanguageCategoryOption[];
  };
  reviewRequired: true;
  canAutoSave: false;
}

export type ConfirmNaturalLanguageDraftInput =
  | {
      idempotencyKey: string;
      type: 'INCOME' | 'EXPENSE';
      transaction: {
        type: 'INCOME' | 'EXPENSE';
        amount: number;
        date: string;
        description: string;
        accountId: string;
        categoryId?: string;
        notes?: string;
      };
    }
  | {
      idempotencyKey: string;
      type: 'TRANSFER';
      transaction: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        date: string;
        description: string;
        notes?: string;
      };
    };

export function useCreateNaturalLanguageDraft() {
  return useMutation({
    mutationFn: (text: string) =>
      apiFetch<NaturalLanguageDraftResult>('/api/transactions/natural-language/draft', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
  });
}

export function useConfirmNaturalLanguageDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfirmNaturalLanguageDraftInput) =>
      apiFetch('/api/transactions/natural-language/confirm', {
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
