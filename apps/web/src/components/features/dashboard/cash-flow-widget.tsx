import { Receipt, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';

interface CashFlowCurrency {
  currency: string;
  income: number;
  expenses: number;
  net: number;
}

interface CashFlowWidgetData {
  income: number;
  expenses: number;
  net: number;
  currency: string;
  byCurrency: CashFlowCurrency[];
  periodStart: string;
  periodEnd: string;
}

interface CashFlowWidgetProps {
  isLoading: boolean;
  data?: CashFlowWidgetData;
  periodLabel?: string;
}

export function CashFlowWidget({ isLoading, data, periodLabel = 'Last 30 days' }: CashFlowWidgetProps) {
  if (isLoading) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 h-full min-h-[300px]">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
      </div>
    );
  }

  const otherCurrencies = data
    ? data.byCurrency.filter((item) => item.currency !== data.currency)
    : [];
  const hasActivity = Boolean(data && (data.income !== 0 || data.expenses !== 0));

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-fg-primary">Cash Flow</h2>
          <p className="text-xs text-fg-secondary mt-1">{periodLabel} · {data?.currency ?? '—'}</p>
        </div>
        <Link
          href="/personal"
          className="text-xs text-accent-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-bg-tertiary p-3">
              <p className="text-xs text-fg-secondary mb-1">Income</p>
              <p className="text-lg font-semibold text-status-positive">
                <AmountDisplay value={data.income} currency={data.currency} />
              </p>
            </div>
            <div className="rounded-lg bg-bg-tertiary p-3">
              <p className="text-xs text-fg-secondary mb-1">Expenses</p>
              <p className="text-lg font-semibold text-status-negative">
                <AmountDisplay value={data.expenses} currency={data.currency} />
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border-subtle mt-4 pt-4">
            <span className="text-sm text-fg-secondary">Net cash flow</span>
            <span className={data.net >= 0 ? 'text-sm font-semibold text-status-positive' : 'text-sm font-semibold text-status-negative'}>
              <AmountDisplay value={data.net} currency={data.currency} />
            </span>
          </div>

          {otherCurrencies.length > 0 && (
            <div className="border-t border-border-subtle mt-4 pt-4 space-y-3">
              <p className="text-xs font-medium text-fg-secondary">Other currencies · not converted</p>
              {otherCurrencies.map((item) => (
                <div key={item.currency} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-fg-secondary">{item.currency}</span>
                  <div className="text-right">
                    <p className="font-medium text-fg-primary">
                      <AmountDisplay value={item.net} currency={item.currency} />
                    </p>
                    <p className="text-xs text-fg-tertiary">
                      Income <AmountDisplay value={item.income} currency={item.currency} /> · Expenses{' '}
                      <AmountDisplay value={item.expenses} currency={item.currency} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasActivity && otherCurrencies.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-fg-secondary mt-4">
              <Receipt size={14} />
              No posted income or expenses recorded in this period.
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <Receipt className="text-fg-secondary mb-3" size={28} />
          <p className="text-sm font-medium text-fg-primary mb-1">Cash flow unavailable</p>
          <p className="text-xs text-fg-secondary">Your cash flow summary for this period could not be loaded.</p>
        </div>
      )}

      <Link
        href="/personal"
        className="mt-auto pt-5 text-sm font-semibold text-accent-primary hover:underline"
      >
        Add or review transactions
      </Link>
    </div>
  );
}
