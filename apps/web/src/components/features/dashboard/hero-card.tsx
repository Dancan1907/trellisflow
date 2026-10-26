import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';

interface HeroCardProps {
  isLoading: boolean;
  data?: {
    total: number;
    personal: number;
    investments: number;
    businesses: number;
    currency: string;
  };
}

export function HeroCard({ isLoading, data }: HeroCardProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-lg p-8">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-12 w-64 mb-4" />
        <div className="grid grid-cols-3 gap-4 mt-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-8">
      <p className="text-sm font-medium text-fg-secondary mb-2">Total Net Worth</p>

      <div className="flex items-baseline gap-4">
        <h1 className="text-5xl font-semibold text-fg-primary tracking-tight">
          <AmountDisplay value={data.total} currency={data.currency} />
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-border-subtle">
        <div>
          <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-1">
            Personal
          </p>
          <p className="text-lg font-medium text-fg-primary">
            <AmountDisplay value={data.personal} currency={data.currency} />
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-1">
            Investments
          </p>
          <p className="text-lg font-medium text-fg-primary">
            <AmountDisplay value={data.investments} currency={data.currency} />
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-1">
            Businesses
          </p>
          <p className="text-lg font-medium text-fg-primary">
            <AmountDisplay value={data.businesses} currency={data.currency} />
          </p>
        </div>
      </div>
    </div>
  );
}
