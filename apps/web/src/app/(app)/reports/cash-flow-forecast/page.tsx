'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CalendarClock, RefreshCw } from 'lucide-react';
import { useCashFlowForecast } from '@/lib/hooks/use-cash-flow-forecast';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CashFlowForecastPage() {
  const [horizonDays, setHorizonDays] = useState(90);
  const [historyDays, setHistoryDays] = useState(90);
  const [incomeAdjustmentPercent, setIncomeAdjustmentPercent] = useState(0);
  const [expenseAdjustmentPercent, setExpenseAdjustmentPercent] = useState(0);
  const { data, isLoading, isError, refetch, isFetching } = useCashFlowForecast({
    horizonDays,
    historyDays,
    incomeAdjustmentPercent,
    expenseAdjustmentPercent,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="p-2 rounded-md border border-border-subtle text-fg-secondary hover:text-fg-primary" aria-label="Back to reports">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-fg-primary">Cash-flow forecast</h1>
          <p className="text-sm text-fg-secondary">A deterministic projection based on your balances, history and recurring rules.</p>
        </div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-sm text-fg-secondary hover:text-fg-primary" disabled={isFetching}>
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-4">
        <label className="text-xs text-fg-secondary">
          Forecast horizon
          <select value={horizonDays} onChange={(event) => setHorizonDays(Number(event.target.value))} className="mt-1 block h-10 w-full rounded-md border border-border-subtle bg-bg-primary px-3 text-sm text-fg-primary">
            <option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option>
          </select>
        </label>
        <label className="text-xs text-fg-secondary">
          Historical lookback
          <select value={historyDays} onChange={(event) => setHistoryDays(Number(event.target.value))} className="mt-1 block h-10 w-full rounded-md border border-border-subtle bg-bg-primary px-3 text-sm text-fg-primary">
            <option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>365 days</option>
          </select>
        </label>
        <label className="text-xs text-fg-secondary">
          Variable income scenario ({incomeAdjustmentPercent}%)
          <input type="range" min="-100" max="100" step="5" value={incomeAdjustmentPercent} onChange={(event) => setIncomeAdjustmentPercent(Number(event.target.value))} className="mt-3 block w-full" />
        </label>
        <label className="text-xs text-fg-secondary">
          Variable expense scenario ({expenseAdjustmentPercent}%)
          <input type="range" min="-100" max="100" step="5" value={expenseAdjustmentPercent} onChange={(event) => setExpenseAdjustmentPercent(Number(event.target.value))} className="mt-3 block w-full" />
        </label>
      </section>

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {isError ? (
        <div className="rounded-lg border border-status-negative/30 bg-bg-secondary p-5 text-sm text-fg-secondary">
          The forecast could not be loaded. Check your connection and try again.
        </div>
      ) : null}
      {data && data.accounts.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-secondary p-8 text-center">
          <CalendarClock className="mx-auto mb-3 text-fg-tertiary" size={28} />
          <h2 className="font-medium text-fg-primary">No eligible cash accounts</h2>
          <p className="mt-1 text-sm text-fg-secondary">Add an active checking, savings, cash, mobile-money or prepaid account to create a forecast.</p>
        </div>
      ) : null}
      {data && data.accounts.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-tertiary">
            <span>As of {formatDate(data.asOf)} · {data.scope.accountCount} accounts · {data.scope.recurringRuleCount} active recurring rules</span>
            <span>Generated {new Date(data.generatedAt).toLocaleString()}</span>
          </div>
          <div className="space-y-4">
            {data.accounts.map((account) => {
              const firstShortfall = account.points.find((point) => point.projectedBalance < 0);
              const finalPoint = account.points[account.points.length - 1];
              return (
                <section key={account.accountId} className="rounded-lg border border-border-subtle bg-bg-secondary p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-fg-primary">{account.accountName}</h2>
                      <p className="text-xs text-fg-tertiary">{account.currency} · {horizonDays}-day projection</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-fg-secondary">Projected closing balance</p>
                      <p className="text-lg font-semibold text-fg-primary"><AmountDisplay value={account.closingBalance} currency={account.currency} /></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-bg-primary p-3">
                      <p className="text-xs text-fg-secondary">Opening balance</p>
                      <p className="mt-1 font-medium text-fg-primary"><AmountDisplay value={account.openingBalance} currency={account.currency} /></p>
                    </div>
                    <div className="rounded-md bg-bg-primary p-3">
                      <p className="text-xs text-fg-secondary">Projected range on {finalPoint ? formatDate(finalPoint.date) : 'horizon end'}</p>
                      <p className="mt-1 font-medium text-fg-primary">{finalPoint ? <><AmountDisplay value={finalPoint.lowerBound} currency={account.currency} /> – <AmountDisplay value={finalPoint.upperBound} currency={account.currency} /></> : '—'}</p>
                    </div>
                  </div>
                  {firstShortfall ? (
                    <p className="flex items-start gap-2 text-sm text-status-negative"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> Projected balance first falls below zero on {formatDate(firstShortfall.date)}.</p>
                  ) : (
                    <p className="text-xs text-status-positive">No negative projected daily balance within this horizon.</p>
                  )}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-fg-secondary">View daily projection</summary>
                    <div className="mt-3 max-h-72 overflow-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-bg-secondary text-fg-tertiary"><tr><th className="py-2">Date</th><th className="py-2 text-right">Projected</th><th className="py-2 text-right">Low</th><th className="py-2 text-right">High</th></tr></thead>
                        <tbody>{account.points.map((point) => <tr key={point.date} className="border-t border-border-subtle"><td className="py-2 text-fg-secondary">{formatDate(point.date)}</td><td className="py-2 text-right text-fg-primary"><AmountDisplay value={point.projectedBalance} currency={account.currency} /></td><td className="py-2 text-right text-fg-secondary"><AmountDisplay value={point.lowerBound} currency={account.currency} /></td><td className="py-2 text-right text-fg-secondary"><AmountDisplay value={point.upperBound} currency={account.currency} /></td></tr>)}</tbody>
                      </table>
                    </div>
                  </details>
                </section>
              );
            })}
          </div>

          {data.warnings.length > 0 ? (
            <section className="rounded-lg border border-status-warning/30 bg-bg-secondary p-4">
              <h2 className="font-medium text-fg-primary">Forecast warnings</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-secondary">{data.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            </section>
          ) : null}

          <section className="rounded-lg border border-border-subtle bg-bg-secondary p-5 space-y-3">
            <h2 className="font-medium text-fg-primary">Forecast assumptions</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-fg-secondary">{data.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
          </section>

          <section className="rounded-lg border border-border-subtle bg-bg-secondary p-5 space-y-3">
            <h2 className="font-medium text-fg-primary">Historical backtesting</h2>
            {data.backtesting.map((result) => (
              <div key={result.currency} className="border-t border-border-subtle pt-3 first:border-0 first:pt-0">
                <p className="text-sm font-medium text-fg-primary">{result.currency}</p>
                <p className="mt-1 text-sm text-fg-secondary">{result.sampleCount} rolling test windows · Mean absolute error per day: {result.meanAbsoluteErrorPerDay === null ? 'Not enough history' : result.meanAbsoluteErrorPerDay.toLocaleString()} · MAPE: {result.meanAbsolutePercentageError === null ? '—' : `${result.meanAbsolutePercentageError}%`}</p>
                <p className="mt-1 text-xs text-fg-tertiary">{result.methodology}</p>
              </div>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
