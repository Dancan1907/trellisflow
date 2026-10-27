'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { useDashboardContainers } from '@/lib/hooks/use-dashboard';
import { AccountCard } from '@/components/features/personal/account-card';
import { CreateAccountModal } from '@/components/features/personal/create-account-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

export default function PersonalPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();
  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { data: containers, isLoading: isLoadingContainers } = useDashboardContainers();

  const personalContainer = containers?.find((c) => c.type === 'PERSONAL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Personal</h1>
          <p className="text-fg-secondary text-sm">
            Manage your bank accounts, wallets, and cards.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!personalContainer}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Plus size={18} />
          Add Account
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle">
        <Link
          href="/personal"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            pathname === '/personal'
              ? 'border-accent-primary text-fg-primary'
              : 'border-transparent text-fg-secondary hover:text-fg-primary'
          }`}
        >
          Accounts
        </Link>
        <Link
          href="/personal/categories"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            pathname === '/personal/categories'
              ? 'border-accent-primary text-fg-primary'
              : 'border-transparent text-fg-secondary hover:text-fg-primary'
          }`}
        >
          Categories
        </Link>
        <Link
          href="/personal/recurring"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            pathname === '/personal/recurring'
              ? 'border-accent-primary text-fg-primary'
              : 'border-transparent text-fg-secondary hover:text-fg-primary'
          }`}
        >
          Recurring
        </Link>
      </div>

      {/* Accounts Grid */}
      {isLoadingAccounts || isLoadingContainers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Plus}
          title="No accounts yet"
          description="Add your first bank account, mobile wallet, or credit card to start tracking your money."
          action={
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!personalContainer}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Add Your First Account
            </button>
          }
        />
      )}

      {/* The Modal */}
      {personalContainer && (
        <CreateAccountModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          containerId={personalContainer.id}
        />
      )}
    </div>
  );
}
