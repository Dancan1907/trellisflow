'use client';

import { useState } from 'react';
import { useCashFlow } from '@/lib/hooks/use-reports';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';

export default function CashFlowReportPage() {
  // Default to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);

  const { data: cashFlow, isLoading } = useCashFlow(from, to);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Cash Flow Statement</h1>
          <p className="text-fg-secondary text-sm">Income vs. Expenses for a specific period.</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex items-center gap-4 bg-bg-secondary border border-border-subtle rounded-lg p-4">
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-secondary mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-3 rounded-md border border-border-subtle bg-bg-primary text-fg-primary text-sm"
          />
        </div>
      </div>

      {isLoading || !cashFlow ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <p className="text-sm font-medium text-fg-secondary mb-2">Income</p>
            <p className="text-2xl font-semibold text-status-positive">
              <AmountDisplay value={cashFlow.income} currency="KES" />
            </p>
          </div>

          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <p className="text-sm font-medium text-fg-secondary mb-2">Expenses</p>
            <p className="text-2xl font-semibold text-status-negative">
              <AmountDisplay value={cashFlow.expenses} currency="KES" />
            </p>
          </div>

          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <p className="text-sm font-medium text-fg-secondary mb-2">Net Cash Flow</p>
            <p
              className={`text-2xl font-semibold ${cashFlow.net >= 0 ? 'text-status-positive' : 'text-status-negative'}`}
            >
              <AmountDisplay value={cashFlow.net} currency="KES" showSign colorize />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
