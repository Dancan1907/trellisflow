import { Skeleton } from '@/components/ui/skeleton';
import { AmountDisplay } from '@/components/shared/amount-display';

interface ContainerCurrencyValue {
  currency: string;
  netWorth: number;
}

interface ContainerCard {
  id: string;
  name: string;
  type: string;
  currency: string;
  accountCount: number;
  netWorth: number;
  byCurrency: ContainerCurrencyValue[];
}

interface ContainerCardsProps {
  isLoading: boolean;
  containers?: ContainerCard[];
  reportingCurrency: string;
}

interface CurrencyTotals {
  currency: string;
  total: number;
  personal: number;
  investments: number;
  businesses: number;
}

export function ContainerCards({
  isLoading,
  containers,
  reportingCurrency,
}: ContainerCardsProps) {
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

  const totals = new Map<string, CurrencyTotals>();
  for (const container of containers) {
    const values = container.byCurrency?.length
      ? container.byCurrency
      : [{ currency: container.currency, netWorth: container.netWorth }];
    for (const value of values) {
      const group = totals.get(value.currency) ?? {
        currency: value.currency,
        total: 0,
        personal: 0,
        investments: 0,
        businesses: 0,
      };
      group.total += value.netWorth;
      if (container.type === 'PERSONAL') group.personal += value.netWorth;
      else if (container.type === 'INVESTMENT') group.investments += value.netWorth;
      else if (container.type.includes('BUSINESS')) group.businesses += value.netWorth;
      totals.set(value.currency, group);
    }
  }

  const primary = totals.get(reportingCurrency) ?? {
    currency: reportingCurrency,
    total: 0,
    personal: 0,
    investments: 0,
    businesses: 0,
  };
  const getPercent = (value: number) =>
    primary.total === 0 ? 0 : Math.round((value / primary.total) * 100);
  const p1 = getPercent(primary.personal);
  const p2 = p1 + getPercent(primary.investments);
  const conicGradient =
    primary.total === 0
      ? 'conic-gradient(var(--border-strong) 0% 100%)'
      : `conic-gradient(
        var(--accent-primary) 0% ${p1}%,
        var(--accent-purple) ${p1}% ${p2}%,
        var(--accent-gold) ${p2}% 100%
      )`;
  const otherCurrencies = Array.from(totals.values())
    .filter((group) => group.currency !== reportingCurrency)
    .sort((left, right) => left.currency.localeCompare(right.currency));

  return (
    <div className="space-y-4">
      <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6">
        <h2 className="text-base font-semibold text-fg-primary mb-6">
          Your Portfolio Overview · {reportingCurrency}
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div
            className="relative w-36 h-36 shrink-0 rounded-full flex items-center justify-center"
            style={{ background: conicGradient }}
          >
            <div className="absolute inset-0 m-auto w-24 h-24 bg-bg-secondary rounded-full flex flex-col items-center justify-center">
              <span className="text-xs text-fg-secondary">Total</span>
              <span className="text-sm font-bold text-fg-primary">
                <AmountDisplay value={primary.total} currency={reportingCurrency} />
              </span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-4">
            {[
              { label: 'Personal', value: primary.personal, color: 'bg-accent-primary' },
              { label: 'Investments', value: primary.investments, color: 'bg-accent-purple' },
              { label: 'Businesses', value: primary.businesses, color: 'bg-accent-gold' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-fg-secondary">{item.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-fg-primary">
                    {getPercent(item.value)}%
                  </span>
                  <p className="text-xs text-fg-secondary">
                    <AmountDisplay value={item.value} currency={reportingCurrency} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {otherCurrencies.length > 0 && (
        <div className="bg-bg-secondary border border-border-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-fg-primary mb-3">
            Other currencies · not converted
          </h3>
          <div className="space-y-3">
            {otherCurrencies.map((group) => (
              <div key={group.currency} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-fg-primary">{group.currency}</p>
                  <p className="text-xs text-fg-secondary">
                    Personal · Investments · Businesses shown separately
                  </p>
                </div>
                <AmountDisplay value={group.total} currency={group.currency} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
