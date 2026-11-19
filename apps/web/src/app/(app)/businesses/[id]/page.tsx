'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Archive,
  Building2,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  useArchiveBusiness,
  useBusiness,
  useBusinessPnl,
  useBusinessRunway,
  type BusinessAccount,
} from '@/lib/hooks/use-businesses';
import { useTransactionsByContainer } from '@/lib/hooks/use-transactions';
import { useSummaries, type SerializedSummary } from '@/lib/hooks/use-summaries';
import { CreateAccountModal } from '@/components/features/personal/create-account-modal';
import { AddTransactionModal } from '@/components/features/transactions/add-transaction-modal';
import { AddSummaryModal } from '@/components/features/businesses/add-summary-modal';
import { CorrectSummaryModal } from '@/components/features/businesses/correct-summary-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { safeNumber } from '@/lib/utils/format-numbers';

const TYPE_LABELS: Record<string, string> = {
  RETAIL: 'Retail',
  SERVICE: 'Service',
  FARMING: 'Farming',
  FREELANCE: 'Freelance',
  MANUFACTURING: 'Manufacturing',
  OTHER: 'Other',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  PREPAID_CARD: 'Prepaid Card',
  CREDIT_CARD: 'Credit Card',
  PERSONAL_LOAN: 'Loan',
  MORTGAGE: 'Mortgage',
  OVERDRAFT: 'Overdraft',
  INVESTMENT_ACCOUNT: 'Investment',
  CUSTOM: 'Other',
};

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = (params?.id as string) ?? '';

  const { data: business, isLoading } = useBusiness(businessId);
  const { data: pnl } = useBusinessPnl(businessId);
  const { data: runway } = useBusinessRunway(businessId);
  const { data: transactionPage, isLoading: transactionsLoading } =
    useTransactionsByContainer(businessId);
  const { data: summaries, isLoading: summariesLoading } = useSummaries(businessId);
  const archiveBusiness = useArchiveBusiness();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [editingSummary, setEditingSummary] = useState<SerializedSummary | null>(null);
  const [transactionAccount, setTransactionAccount] = useState<BusinessAccount | null>(null);

  const isExternal = business?.type === 'EXTERNAL_BUSINESS';

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-2xl space-y-4">
        <Link
          href="/businesses"
          className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary"
        >
          <ArrowLeft size={16} /> Back to Businesses
        </Link>
        <EmptyState
          icon={Building2}
          title="Business not found"
          description="This business may have been archived, or it does not belong to your account."
        />
      </div>
    );
  }

  const transactions = transactionPage?.items ?? [];
  const pnlMax = Math.max(pnl?.totalIncome ?? 0, pnl?.totalExpenses ?? 0, 1);

  const handleArchive = async () => {
    if (
      !window.confirm(
        `Archive "${business.name}"? It will disappear from your dashboard, but its history is kept.`,
      )
    ) {
      return;
    }

    try {
      await archiveBusiness.mutateAsync(business.id);
      showToast('success', 'Business archived', `${business.name} has been archived.`);
      router.push('/businesses');
    } catch (error) {
      showToast(
        'error',
        'Failed to archive business',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <Link
        href="/businesses"
        className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} /> Back to Businesses
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-md bg-accent-subtle flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-accent-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold text-fg-primary">{business.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-fg-secondary font-medium">
                {isExternal ? 'External' : 'Internal'}
              </span>
            </div>
            <p className="text-sm text-fg-secondary">
              {TYPE_LABELS[business.businessProfile?.businessType ?? 'OTHER'] ?? 'Business'} ·{' '}
              {business.currency} ·{' '}
              {business.businessProfile?.startDate
                ? `since ${new Date(business.businessProfile.startDate).toLocaleDateString(
                    'en-KE',
                    {
                      month: 'short',
                      year: 'numeric',
                    },
                  )}`
                : 'start date not set'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleArchive}
            disabled={archiveBusiness.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-border-subtle text-sm font-medium text-fg-secondary hover:text-status-negative hover:border-status-negative transition-colors disabled:opacity-50"
          >
            <Archive size={16} />
            {archiveBusiness.isPending ? 'Archiving…' : 'Archive'}
          </button>
          {!isExternal && (
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              <Plus size={18} /> Add Account
            </button>
          )}
        </div>
      </div>

      {/* Headline metrics (Internal businesses only) */}
      {!isExternal && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Net Worth">
            <AmountDisplay
              value={business.netWorth.netWorth}
              currency={business.currency}
              colorize
              className="text-2xl font-semibold"
            />
          </MetricCard>
          <MetricCard label="Assets">
            <AmountDisplay
              value={business.netWorth.totalAssets}
              currency={business.currency}
              className="text-2xl font-semibold"
            />
          </MetricCard>
          <MetricCard label="Liabilities">
            <AmountDisplay
              value={business.netWorth.totalLiabilities}
              currency={business.currency}
              className="text-2xl font-semibold"
            />
          </MetricCard>
          <MetricCard
            label="Cash Runway"
            hint={
              runway
                ? runway.runwayMonths === null
                  ? 'No expense history yet'
                  : `Monthly burn ${business.currency} ${runway.monthlyBurn.toLocaleString(
                      'en-US',
                      {
                        maximumFractionDigits: 0,
                      },
                    )}`
                : undefined
            }
          >
            {runway ? (
              <p className="text-2xl font-semibold text-fg-primary">
                {runway.runwayMonths === null ? '—' : `${runway.runwayMonths.toFixed(1)} mo`}
              </p>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </MetricCard>
        </div>
      )}

      {/* External Business Manual Summaries View */}
      {isExternal && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-fg-primary">Manual Summaries</h2>
            <button
              onClick={() => setIsSummaryModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              <Plus size={18} /> Add Summary
            </button>
          </div>

          {summariesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !summaries || summaries.items.length === 0 ? (
            <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 text-sm text-fg-secondary">
              No summaries recorded yet. Add a manual summary to track this external business.
            </div>
          ) : (
            <div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-bg-tertiary/50 text-fg-secondary text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3 text-right">Net Worth</th>
                    <th className="px-4 py-3 text-center">Versions</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {summaries.items.map((summary) => (
                    <tr key={summary.id} className="hover:bg-bg-tertiary/20 transition-colors">
                      <td className="px-4 py-3 text-fg-primary">{summary.date}</td>
                      <td className="px-4 py-3 text-fg-secondary">{summary.unit || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-fg-primary">
                        <AmountDisplay value={summary.netWorth} currency={summary.currency} />
                      </td>
                      <td className="px-4 py-3 text-center text-fg-secondary">
                        {summary.versionCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-accent-primary hover:text-accent-hover text-xs font-medium"
                          onClick={() => setEditingSummary(summary)}
                        >
                          Correct
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Profit & Loss (Internal businesses only) */}
      {!isExternal && (
        <section className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium text-fg-primary">Profit &amp; Loss</h2>
              <p className="text-xs text-fg-secondary mt-1">
                {pnl ? `${pnl.from} to ${pnl.to}` : 'Last 30 days'}
              </p>
            </div>
          </div>

          {!pnl ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <PnlTotal label="Income" value={pnl.totalIncome} currency={pnl.currency} positive />
                <PnlTotal
                  label="Expenses"
                  value={pnl.totalExpenses}
                  currency={pnl.currency}
                  negative
                />
                <PnlTotal
                  label="Net Profit"
                  value={pnl.netProfit}
                  currency={pnl.currency}
                  positive={pnl.netProfit >= 0}
                  negative={pnl.netProfit < 0}
                />
              </div>

              {pnl.byCategory.length === 0 ? (
                <p className="text-sm text-fg-secondary">
                  No income or expenses recorded in this period.
                </p>
              ) : (
                <div className="space-y-4">
                  {pnl.byCategory.map((row) => {
                    const isIncome = row.type === 'INCOME';
                    const width = Math.round((row.amount / pnlMax) * 100);
                    return (
                      <div key={`${row.type}:${row.categoryId ?? 'uncategorized'}`}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-fg-primary">{row.categoryName}</span>
                          <AmountDisplay
                            value={row.amount}
                            currency={pnl.currency}
                            className={isIncome ? 'text-status-positive' : 'text-status-negative'}
                          />
                        </div>
                        <div className="h-2 rounded bg-bg-tertiary overflow-hidden">
                          <div
                            className={
                              isIncome ? 'h-full bg-status-positive' : 'h-full bg-status-negative'
                            }
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Accounts (Internal businesses only) */}
      {!isExternal && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-fg-primary">
              Accounts ({business.accounts.length})
            </h2>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-accent-primary hover:text-accent-hover"
            >
              <Plus size={16} /> Add Account
            </button>
          </div>

          {business.accounts.length === 0 ? (
            <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 text-sm text-fg-secondary">
              No accounts yet. Add a business bank account, cash box, or loan to start tracking
              money.
            </div>
          ) : (
            <div className="space-y-2">
              {business.accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-4 p-4 bg-bg-secondary border border-border-subtle rounded-lg"
                >
                  <div className="w-10 h-10 rounded-md bg-bg-tertiary flex items-center justify-center shrink-0">
                    <Wallet size={18} className="text-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg-primary truncate">{account.name}</p>
                    <p className="text-xs text-fg-secondary">
                      {ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType} ·{' '}
                      {account.category === 'ASSET' ? 'Asset' : 'Liability'}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-fg-primary font-mono shrink-0">
                    <AmountDisplay value={account.currentBalance} currency={account.currency} />
                  </p>
                  <button
                    onClick={() => setTransactionAccount(account)}
                    title={`Add transaction to ${account.name}`}
                    className="p-2 rounded-md text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
                  >
                    <Receipt size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Transactions (Internal businesses only) */}
      {!isExternal && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-fg-primary">Recent Transactions</h2>
            <p className="text-xs text-fg-secondary">
              Use the receipt icon on an account to add one.
            </p>
          </div>

          {transactionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 text-sm text-fg-secondary">
              No transactions yet. Record income or expenses against a business account.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => {
                const isIncome = transaction.type === 'INCOME';
                const isExpense = transaction.type === 'EXPENSE';
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-4 p-4 bg-bg-secondary border border-border-subtle rounded-lg"
                  >
                    <div
                      className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-status-positive/10' : 'bg-status-negative/10'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp size={18} className="text-status-positive" />
                      ) : (
                        <TrendingDown size={18} className="text-status-negative" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg-primary truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-fg-secondary">
                        {transaction.category?.name ?? 'Uncategorized'} ·{' '}
                        {new Date(transaction.date).toLocaleDateString('en-KE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-medium font-mono shrink-0 ${
                        isIncome
                          ? 'text-status-positive'
                          : isExpense
                            ? 'text-status-negative'
                            : 'text-fg-secondary'
                      }`}
                    >
                      <AmountDisplay
                        value={
                          isExpense
                            ? -safeNumber(transaction.amount)
                            : safeNumber(transaction.amount)
                        }
                        currency={transaction.currency}
                      />
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      <CreateAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        containerId={business.id}
        currency={business.currency}
      />

      <AddSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        businessId={business.id}
        currency={business.currency}
      />

      {editingSummary && (
        <CorrectSummaryModal
          isOpen={!!editingSummary}
          onClose={() => setEditingSummary(null)}
          businessId={business.id}
          summary={editingSummary}
        />
      )}

      {transactionAccount && (
        <AddTransactionModal
          isOpen={!!transactionAccount}
          onClose={() => setTransactionAccount(null)}
          accountId={transactionAccount.id}
          currency={transactionAccount.currency}
          containerId={business.id}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
      <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-3">{label}</p>
      {children}
      {hint && <p className="text-xs text-fg-tertiary mt-2">{hint}</p>}
    </div>
  );
}

function PnlTotal({
  label,
  value,
  currency,
  positive = false,
  negative = false,
}: {
  label: string;
  value: number;
  currency: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="bg-bg-tertiary/60 rounded-md p-4">
      <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-1">{label}</p>
      <p
        className={`text-xl font-semibold font-mono ${
          positive ? 'text-status-positive' : negative ? 'text-status-negative' : 'text-fg-primary'
        }`}
      >
        <AmountDisplay value={value} currency={currency} />
      </p>
    </div>
  );
}
