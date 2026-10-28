//User Management custom hook
//Server State & Profile Caching (useProfile): Fetches and caches the authenticated user's
//  profile details under the query key ['users', 'me'].

//Optimistic Global Sync (useUpdateProfile): When a user updates their profile
// (like changing their display name), the mutation handler invalidates the query cache
// and instantly updates the Zustand auth store (setAuth). This ensures UI elements
// dependent on the user's name (like the Topbar) update immediately without waiting for a full page reload.

//Secure Action Handling (useChangePassword): Encapsulates the POST /api/users/me/change-password
//  request into a clean mutation hook for safe password rotation.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';
import { useAuthStore } from '../auth/auth-store';

//Fetching User Details
export interface Profile {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: string | null;
  timezone: string;
  reportingCurrency: string;
  tier: 'FREE' | 'PAID';
  personaHint: 'EMPLOYEE' | 'INVESTOR' | 'BUSINESS_OWNER' | 'MULTI_BUSINESS_OWNER' | null;
  createdAt: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => apiFetch<Profile>('/api/users/me'),
  });
}

//Updating User Information & Zustand Sync
export interface UpdateProfileInput {
  name?: string;
  timezone?: string;
  reportingCurrency?: string;
  personaHint?: Profile['personaHint'];
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<Profile>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      // Keep the Zustand user in sync so topbar shows the new name
      if (token) {
        setAuth(token, {
          id: updated.id,
          name: updated.name,
          email: updated.email,
        });
      }
    },
  });
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

//Password Rotation Mutation
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiFetch<{ message: string }>('/api/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}
