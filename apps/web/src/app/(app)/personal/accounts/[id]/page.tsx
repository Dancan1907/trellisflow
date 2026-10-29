'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowDownRight, ArrowUpRight, Edit, Archive, Trash2 } from 'lucide-react';
import { useAccounts, useUpdateAccount, useArchiveAccount } from '@/lib/hooks/use-accounts';
import { useTransactions, useDeleteTransaction } from '@/lib/hooks/use-transactions';
import { AddTransactionModal } from '@/components/features/transactions/add-transaction-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Modal } from '@/components/ui/modal';
import { showToast } from '@/components/ui/toast';

export default function AccountDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { data: txData, isLoading: isLoadingTx } = useTransactions(id as string);
  const updateAccount = useUpdateAccount();
  const archiveAccount = useArchiveAccount();
  const deleteTransaction = useDeleteTransaction();

  const [editName, setEditName] = useState('');
  const [editInstitution, setEditInstitution] = useState('');

  const account = accounts?.find((a) => a.id === id);
  const transactions = txData?.items || [];

  if (isLoadingAccounts || !account) {
    return <Skeleton className="h-96 w-full" />;
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        name: editName,
        institution: editInstitution,
      });
      showToast('success', 'Account updated');
      setIsEditModalOpen(false);
    } catch (err) {
      showToast('error', 'Failed to update', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleArchive = async () => {
    if (
      !confirm(
        'Are you sure you want to archive this account? It will be hidden but history preserved.',
      )
    )
      return;
    try {
      await archiveAccount.mutateAsync(account.id);
      showToast('success', 'Account archived');
      router.push('/personal');
    } catch (err) {
      showToast('error', 'Failed to archive', err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this transaction? This will adjust the account balance.',
      )
    )
      return;
    try {
      await deleteTransaction.mutateAsync(txId);
      showToast('success', 'Transaction deleted');
    } catch (err) {
      showToast('error', 'Failed to delete', err instanceof Error ? err.message : 'Error');
    }
  };

  const openEditModal = () => {
    setEditName(account.name);
    setEditInstitution(account.institution || '');
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Balance */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className="text-sm font-medium text-fg-secondary">{account.name}</p>
            <button onClick={openEditModal} className="text-fg-tertiary hover:text-fg-primary">
              <Edit size={14} />
            </button>
            <button onClick={handleArchive} className="text-fg-tertiary hover:text-status-negative">
              <Archive size={14} />
            </button>
          </div>
          <h1 className="text-4xl font-semibold text-fg-primary">
            <AmountDisplay value={account.currentBalance} currency={account.currency} />
          </h1>
        </div>
        <button
          onClick={() => setIsTxModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={18} /> Add Transaction
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
                className="flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      tx.type === 'EXPENSE'
                        ? 'bg-status-negative/10 text-status-negative'
                        : 'bg-status-positive/10 text-status-positive'
                    }`}
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
                <div className="flex items-center gap-4">
                  <AmountDisplay
                    value={tx.type === 'EXPENSE' ? `-${tx.amount}` : tx.amount}
                    currency={tx.currency}
                    colorize
                    showSign
                  />
                  <button
                    onClick={() => handleDeleteTx(tx.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-fg-tertiary hover:text-status-negative transition-all"
                    title="Delete Transaction"
                  >
                    <Trash2 size={16} />
                  </button>
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
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        accountId={account.id}
        currency={account.currency}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Account"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">Account Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg-primary mb-2">Institution</label>
            <input
              type="text"
              value={editInstitution}
              onChange={(e) => setEditInstitution(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-sm text-fg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
