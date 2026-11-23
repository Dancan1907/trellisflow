import { Skeleton } from '@/components/ui/skeleton';
import { AmountDisplay } from '@/components/shared/amount-display';

interface ContainerCard {
  id: string;
  name: string;
  type: string;
  currency: string;
  accountCount: number;
  netWorth: number;
}

interface ContainerCardsProps {
  isLoading: boolean;
  containers?: ContainerCard[];
}

export function ContainerCards({ isLoading, containers }: ContainerCardsProps) {
  if (isLoading || !containers) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 h-80">
        <Skeleton className="h-6 w-32 mb-8" />
        <div className="flex items-center gap-8">
          <Skeleton className="w-32 h-32 rounded-full" />
          <div className="space-y-4 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const total = containers.reduce((sum, c) => sum + c.netWorth, 0);

  // Calculate percentages for the donut chart
  const getPercent = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 100));

  const personal = containers
    .filter((c) => c.type === 'PERSONAL')
    .reduce((s, c) => s + c.netWorth, 0);
  const investments = containers
    .filter((c) => c.type === 'INVESTMENT')
    .reduce((s, c) => s + c.netWorth, 0);
  const businesses = containers
    .filter((c) => c.type.includes('BUSINESS'))
    .reduce((s, c) => s + c.netWorth, 0);

  // Hardcoded segments for CSS conic-gradient to match the design
  const p1 = getPercent(personal);
  const p2 = p1 + getPercent(investments);

  // If all are zero, show a flat grey ring
  const conicGradient =
    total === 0
      ? 'conic-gradient(var(--border-strong) 0% 100%)'
      : `conic-gradient(
        var(--accent-primary) 0% ${p1}%, 
        var(--accent-purple) ${p1}% ${p2}%, 
        var(--accent-gold) ${p2}% 100%
      )`;

  const currency = containers[0]?.currency || 'KES';

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6">
      <h2 className="text-base font-semibold text-fg-primary mb-6">Your Portfolio Overview</h2>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Donut Chart */}
        <div
          className="relative w-36 h-36 shrink-0 rounded-full flex items-center justify-center"
          style={{ background: conicGradient }}
        >
          {/* Inner circle to make it a donut */}
          <div className="absolute inset-0 m-auto w-24 h-24 bg-bg-secondary rounded-full flex flex-col items-center justify-center">
            <span className="text-xs text-fg-secondary">Total</span>
            <span className="text-sm font-bold text-fg-primary">
              <AmountDisplay value={total} currency={currency} />
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-primary" />
              <span className="text-sm text-fg-secondary">Personal</span>
            </div>
            <span className="text-sm font-medium text-fg-primary">{getPercent(personal)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-purple" />
              <span className="text-sm text-fg-secondary">Investments</span>
            </div>
            <span className="text-sm font-medium text-fg-primary">{getPercent(investments)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-gold" />
              <span className="text-sm text-fg-secondary">Businesses</span>
            </div>
            <span className="text-sm font-medium text-fg-primary">{getPercent(businesses)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
