import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        // Save the lightweight cookie for the middleware
        document.cookie = `trellisflow-authenticated=true; path=/; max-age=2592000`; // 30 days
        set({ token, user });
      },
      clearAuth: () => {
        // Remove the cookie
        document.cookie = `trellisflow-authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        set({ token: null, user: null });
      },
    }),
    {
      name: 'trellisflow-auth',
    },
  ),
);
