'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/lib/api/api-client';
import { Logo } from '@/components/shared/logo';

// 1. The actual form logic is moved to a sub-component
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const data = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });

      setMessage(data.message);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-8 shadow-md">
      <h1 className="text-2xl font-semibold text-fg-primary mb-2">Set new password</h1>
      <p className="text-fg-secondary text-sm mb-6">
        Your new password must be different from previously used passwords.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-status-negative/10 border border-status-negative rounded-md text-status-negative text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-status-positive/10 border border-status-positive rounded-md text-status-positive text-sm">
          {message} Redirecting to login...
        </div>
      )}

      {!token ? (
        <div className="text-center">
          <Link href="/forgot-password" className="text-accent-primary hover:underline">
            Request a new reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full h-10 pl-3 pr-10 rounded-md border border-border-subtle bg-bg-primary text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-secondary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !!message}
            className="w-full h-10 rounded-md bg-accent-primary text-white font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-fg-secondary">
        <Link href="/login" className="text-accent-primary hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}

// 2. The default export wraps the form in a Suspense boundary
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="large" />
        </div>

        {/* Suspense Boundary is required by Next.js 15 for useSearchParams */}
        <Suspense
          fallback={
            <div className="bg-bg-secondary border border-border-subtle rounded-lg p-8 shadow-md flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
