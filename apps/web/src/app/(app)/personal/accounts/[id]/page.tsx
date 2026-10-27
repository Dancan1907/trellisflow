'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { useTransactions } from '@/lib/hooks/use-transactions';
import { AddTransactionModal } from '@/components/features/transactions/add-transaction-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

export default function AccountDetailPage() {
  const { id } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { data: txData, isLoading: isLoadingTx } = useTransactions(id as string);

  const account = accounts?.find((a) => a.id === id);
  const transactions = txData?.items || [];

  if (isLoadingAccounts || !account) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Balance */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-fg-secondary mb-1">{account.name}</p>
          <h1 className="text-4xl font-semibold text-fg-primary">
            <AmountDisplay value={account.currentBalance} currency={account.currency} />
          </h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={18} />
          Add Transaction
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h2 className="font-medium text-fg-primary">Recent Transactions</h2>
        </div>

        {isLoadingTx ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${tx.type === 'EXPENSE' ? 'bg-status-negative/10 text-status-negative' : 'bg-status-positive/10 text-status-positive'}`}
                  >
                    {tx.type === 'EXPENSE' ? (
                      <ArrowDownRight size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-fg-primary">{tx.description}</p>
                    <p className="text-xs text-fg-secondary">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <AmountDisplay
                    value={tx.type === 'EXPENSE' ? `-${tx.amount}` : tx.amount}
                    currency={tx.currency}
                    colorize
                    showSign
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={Plus}
              title="No transactions yet"
              description="Add your first transaction to this account."
            />
          </div>
        )}
      </div>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accountId={account.id}
        currency={account.currency}
      />
    </div>
  );
}
