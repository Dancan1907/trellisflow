'use client';

import { useAuthStore } from '@/lib/auth/auth-store';
import { AmountDisplay } from '@/components/shared/amount-display';

export default function ProfileSettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-medium text-fg-primary mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Full Name</label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-tertiary text-fg-secondary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-tertiary text-fg-secondary"
            />
          </div>
          <p className="text-xs text-fg-tertiary mt-2">
            To change your email or password, please visit the Security tab.
          </p>
        </div>
      </div>
    </div>
  );
}
