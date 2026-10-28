'use client';

import { useEffect, useState } from 'react';
import { useProfile, useUpdateProfile, type Profile } from '@/lib/hooks/use-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// Simplified list for now. In the future, we can load a full IANA timezone list.
const TIMEZONES = [
  'UTC',
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'NGN', 'ZAR', 'UGX', 'TZS'];

export default function PreferencesSettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('');
  const [persona, setPersona] = useState<Profile['personaHint']>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setTimezone(profile.timezone || 'UTC');
      setCurrency(profile.reportingCurrency || 'KES');
      setPersona(profile.personaHint || null);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await updateProfile.mutateAsync({
        timezone,
        reportingCurrency: currency,
        personaHint: persona,
      });
      showToast('success', 'Preferences updated', 'Your preferences have been saved.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update preferences';
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

  const hasChanges =
    timezone !== (profile?.timezone || 'UTC') ||
    currency !== (profile?.reportingCurrency || 'KES') ||
    persona !== (profile?.personaHint || null);

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-medium text-fg-primary mb-1">Preferences</h2>
        <p className="text-xs text-fg-secondary mb-6">Customize your TrellisFlow experience.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">
              Reporting Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-xs text-fg-tertiary mt-1">
              This is the currency used to calculate your total net worth.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-xs text-fg-tertiary mt-1">
              Used for scheduling recurring transactions and daily snapshots.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">
              Primary Persona
            </label>
            <select
              value={persona || ''}
              onChange={(e) => setPersona((e.target.value as Profile['personaHint']) || null)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="">Not specified</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="INVESTOR">Investor</option>
              <option value="BUSINESS_OWNER">Business Owner</option>
              <option value="MULTI_BUSINESS_OWNER">Multi-Business Owner</option>
            </select>
          </div>

          {error && <p className="text-sm text-status-negative">{error}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={updateProfile.isPending || !hasChanges}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {updateProfile.isPending ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
