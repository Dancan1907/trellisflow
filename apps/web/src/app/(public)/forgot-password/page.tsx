'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/api-client';
import { Logo } from '@/components/shared/logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const data = await apiFetch<{ message: string; devToken?: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        },
      );

      setMessage(data.message);

      // In development, the API returns a devToken.
      // We'll store it in localStorage so the reset page can pick it up.
      if (data.devToken) {
        localStorage.setItem('reset-token', data.devToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="large" />
        </div>

        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-8 shadow-md">
          <h1 className="text-2xl font-semibold text-fg-primary mb-2">Reset your password</h1>
          <p className="text-fg-secondary text-sm mb-6">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-status-negative/10 border border-status-negative rounded-md text-status-negative text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-status-positive/10 border border-status-positive rounded-md text-status-positive text-sm">
              {message}
              {/* Add a button to go to the reset page in dev mode */}
              <div className="mt-3">
                <Link href="/reset-password" className="font-semibold underline">
                  Click here to reset your password
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !!message}
              className="w-full h-10 rounded-md bg-accent-primary text-white font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-fg-secondary">
            Remember your password?{' '}
            <Link href="/login" className="text-accent-primary hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
