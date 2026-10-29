'use client';

import { useState } from 'react';
import { KeyRound, Monitor, Smartphone, Globe, Trash2, LogOut, ShieldCheck } from 'lucide-react';
import {
  useSessions,
  useRevokeSession,
  useLogoutAll,
  type Session,
} from '@/lib/hooks/use-sessions';
import { useChangePassword } from '@/lib/hooks/use-profile';
import { describeUserAgent } from '@/lib/utils/parse-user-agent';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';

export default function SecuritySettingsPage() {
  const { data: sessions, isLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const logoutAll = useLogoutAll();
  const changePassword = useChangePassword();

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Confirmation modals
  const [revokeTarget, setRevokeTarget] = useState<Session | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  //Password Update Handler & Validation
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must differ from the current one.');
      return;
    }

    try {
      const result = await changePassword.mutateAsync({ currentPassword, newPassword });
      showToast('success', 'Password updated', result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(msg);
      showToast('error', 'Could not change password', msg);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeSession.mutateAsync(revokeTarget.id);
      showToast('success', 'Session revoked');
      setRevokeTarget(null);
    } catch (err) {
      showToast('error', 'Failed to revoke session', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll.mutateAsync();
      showToast('success', 'Signed out from all devices');
      setConfirmLogoutAll(false);
    } catch (err) {
      showToast(
        'error',
        'Failed to log out all devices',
        err instanceof Error ? err.message : 'Error',
      );
    }
  };

  return (
    <div className="space-y-10 max-w-2xl">
      {/* ============================== Password ============================== */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-md bg-bg-tertiary flex items-center justify-center">
            <KeyRound size={18} className="text-accent-primary" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-fg-primary">Password</h2>
            <p className="text-xs text-fg-secondary">Change the password used to sign in.</p>
          </div>
        </div>

        <form
          onSubmit={handleChangePassword}
          className="space-y-4 bg-bg-tertiary/40 border border-border-subtle rounded-lg p-6"
        >
          <div>
            <label className="block text-sm font-medium text-fg-secondary mb-1">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">
                New password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          {passwordError && <p className="text-sm text-status-negative">{passwordError}</p>}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {changePassword.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>

      {/* ============================== Sessions ============================== */}
      <section>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-bg-tertiary flex items-center justify-center">
              <ShieldCheck size={18} className="text-accent-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-fg-primary">Active sessions</h2>
              <p className="text-xs text-fg-secondary">
                Devices currently signed in to your account.
              </p>
            </div>
          </div>
          <button
            onClick={() => setConfirmLogoutAll(true)}
            disabled={logoutAll.isPending || !sessions || sessions.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-status-negative/40 text-status-negative text-sm font-medium hover:bg-status-negative/10 transition-colors disabled:opacity-40"
          >
            <LogOut size={14} /> Log out all
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onRevoke={() => setRevokeTarget(s)}
                isRevoking={revokeSession.isPending && revokeTarget?.id === s.id}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Monitor}
            title="No active sessions"
            description="When you sign in on another device, it will appear here."
          />
        )}
      </section>

      {/* ============================== Modals ============================== */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke this session?"
      >
        <p className="text-sm text-fg-secondary mb-6">
          The device will be signed out immediately and will need to sign in again.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setRevokeTarget(null)}
            className="px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleRevoke}
            disabled={revokeSession.isPending}
            className="px-4 py-2 rounded-md bg-status-negative text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {revokeSession.isPending ? 'Revoking…' : 'Revoke'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmLogoutAll}
        onClose={() => setConfirmLogoutAll(false)}
        title="Log out from every device?"
      >
        <p className="text-sm text-fg-secondary mb-6">
          This will sign you out of every session, including the one you&apos;re using now. You will
          need to sign in again.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setConfirmLogoutAll(false)}
            className="px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleLogoutAll}
            disabled={logoutAll.isPending}
            className="px-4 py-2 rounded-md bg-status-negative text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {logoutAll.isPending ? 'Signing out…' : 'Log out all'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function SessionRow({
  session,
  onRevoke,
  isRevoking,
}: {
  session: Session;
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  const label = describeUserAgent(session.userAgent);
  const isMobile = /iphone|ipad|android/i.test(session.userAgent ?? '');
  const Icon = isMobile ? Smartphone : Monitor;

  return (
    <div className="flex items-center gap-4 p-4 bg-bg-tertiary/40 border border-border-subtle rounded-lg">
      <div className="w-9 h-9 rounded-md bg-bg-primary flex items-center justify-center shrink-0">
        <Icon size={18} className="text-fg-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg-primary truncate">{label}</p>
        <div className="flex items-center gap-3 text-xs text-fg-secondary mt-1 flex-wrap">
          {session.ipAddress && (
            <span className="inline-flex items-center gap-1">
              <Globe size={12} /> {session.ipAddress}
            </span>
          )}
          <span>Last active {formatRelative(session.lastUsedAt)}</span>
        </div>
      </div>
      <button
        onClick={onRevoke}
        disabled={isRevoking}
        className="p-2 rounded-md text-fg-tertiary hover:text-status-negative hover:bg-status-negative/10 transition-colors disabled:opacity-40"
        title="Revoke session"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then) / 1000; // seconds

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}
