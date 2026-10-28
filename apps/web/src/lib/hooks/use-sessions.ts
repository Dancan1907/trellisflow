import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

//Metadata  tracked for each login session. This is used to display the list of active
//  sessions for a user and allow them to revoke sessions if needed.
export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}
//Fetching active sessions
export function useSessions() {
  return useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => apiFetch<Session[]>('/api/auth/sessions'),
  });
}

//Terminating a specific device session
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/api/auth/sessions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
  });
}

//Global session revocation
export function useLogoutAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>('/api/auth/logout-all', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
  });
}
