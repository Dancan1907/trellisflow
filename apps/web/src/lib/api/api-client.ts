import { useAuthStore } from '../auth/auth-store';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * A centralized fetch wrapper.
 * It automatically adds the JWT token to every request.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // 1. Get the token from our Zustand store
  const token = useAuthStore.getState().token;

  // 2. Prepare headers
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 3. Make the request
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // 4. Handle 401 Unauthorized (token expired)
  if (response.status === 401) {
    useAuthStore.getState().clearAuth();
    // We can add a redirect to /login here later
  }

  // 5. Handle errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'An error occurred');
  }

  // 6. Return the JSON
  return response.json();
}
