import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';

interface CashFlowWidgetProps {
  isLoading: boolean;
  data?: {
    income: number;
    expenses: number;
    net: number;
  };
}

export function CashFlowWidget({ isLoading, data }: CashFlowWidgetProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-32 mb-4" />
      </div>
    );
  }

  const isPositive = data.net >= 0;

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
      <h3 className="text-sm font-medium text-fg-secondary mb-4">This Month's Cash Flow</h3>

      <div className="flex items-baseline gap-2 mb-6">
        <span className={isPositive ? 'text-status-positive' : 'text-status-negative'}>
          {isPositive ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
        </span>
        <span className="text-2xl font-semibold text-fg-primary">
          <AmountDisplay value={data.net} showSign colorize />
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-fg-secondary">Income</span>
          <span className="font-medium text-status-positive">
            +<AmountDisplay value={data.income} className="text-status-positive" />
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-fg-secondary">Expenses</span>
          <span className="font-medium text-status-negative">
            −<AmountDisplay value={data.expenses} className="text-status-negative" />
          </span>
        </div>
      </div>
    </div>
  );
}
