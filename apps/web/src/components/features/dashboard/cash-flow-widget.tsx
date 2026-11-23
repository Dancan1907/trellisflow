import { Receipt, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface CashFlowWidgetProps {
  isLoading: boolean;
  data?: any; // We are ignoring the cash flow data prop for this visual redesign
}

export function CashFlowWidget({ isLoading }: CashFlowWidgetProps) {
  if (isLoading) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 h-full min-h-[300px]">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-fg-primary">Recent Activity</h2>
        <Link
          href="/personal"
          className="text-xs text-accent-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* Empty State matching Image 3 */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center border border-border-subtle z-10 relative">
            <Receipt className="text-fg-secondary" size={28} />
          </div>
          {/* Green Check badge */}
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center border-4 border-bg-secondary z-20">
            <svg
              className="w-4 h-4 text-bg-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h3 className="text-sm font-bold text-fg-primary mb-1">No recent transactions</h3>
        <p className="text-xs text-fg-secondary max-w-[200px] mb-6">
          Your activity will appear here once you make a transaction.
        </p>

        <Link
          href="/personal"
          className="px-5 py-2.5 rounded-full bg-accent-primary text-bg-primary text-sm font-bold hover:bg-accent-hover transition-colors"
        >
          Add Transaction
        </Link>
      </div>
    </div>
  );
}
