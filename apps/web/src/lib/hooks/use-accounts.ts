import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

// Types matching the backend response
interface Account {
  id: string;
  name: string;
  category: 'ASSET' | 'LIABILITY';
  accountType: string;
  currency: string;
  currentBalance: string;
  institution: string | null;
}

interface CreateAccountDto {
  name: string;
  category: 'ASSET' | 'LIABILITY';
  accountType: string;
  currency: string;
  initialBalance?: number;
  containerId: string;
  institution?: string;
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<Account[]>('/api/accounts'),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAccountDto) =>
      apiFetch<Account>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
