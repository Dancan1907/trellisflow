'use client';

import { useEffect, useState } from 'react';
import { useProfile, useUpdateProfile } from '@/lib/hooks/use-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

export default function ProfileSettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load initial data into the form
  useEffect(() => {
    if (profile) {
      setName(profile.name);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    try {
      await updateProfile.mutateAsync({ name });
      showToast('success', 'Profile updated', 'Your name has been successfully updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(msg);
      showToast('error', 'Update failed', msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-lg">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-medium text-fg-primary mb-1">Profile</h2>
        <p className="text-xs text-fg-secondary mb-6">Manage your personal information.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-tertiary text-fg-secondary cursor-not-allowed"
            />
            <p className="text-xs text-fg-tertiary mt-1">
              To change your email, please contact support.
            </p>
          </div>

          {error && <p className="text-sm text-status-negative">{error}</p>}

          <div className="pt-4">
            <button
              type="submit"
              disabled={updateProfile.isPending || name === profile?.name}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
