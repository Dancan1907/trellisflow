import { Wallet, TrendingUp, Building2 } from 'lucide-react';
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
    byCurrency?: Array<{ currency: string; totalNetWorth: number }>;
    currencyBreakdownAvailable?: boolean;
  };
}

export function HeroCard({ isLoading, data }: HeroCardProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-bg-secondary border border-border-subtle rounded-xl p-5 h-32">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: `Net Worth · ${data.currency}`,
      value: data.total,
      icon: Wallet,
      color: 'text-accent-primary',
      bg: 'bg-accent-primary/10',
      stroke: 'var(--accent-primary)',
    },
    {
      label: 'Investments',
      value: data.investments,
      icon: TrendingUp,
      color: 'text-accent-purple',
      bg: 'bg-accent-purple/10',
      stroke: 'var(--accent-purple)',
    },
    {
      label: 'Businesses',
      value: data.businesses,
      icon: Building2,
      color: 'text-accent-gold',
      bg: 'bg-accent-gold/10',
      stroke: 'var(--accent-gold)',
    },
  ];

  const otherCurrencies = data.byCurrency?.filter(
    (item) => item.currency !== data.currency,
  ) ?? [];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className="bg-bg-secondary border border-border-subtle rounded-xl p-5 relative overflow-hidden group hover:border-border-strong transition-colors"
          >
            <div className="absolute bottom-0 left-0 w-full h-12 opacity-30 pointer-events-none">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path
                  d="M0,100 L0,80 Q20,70 40,60 T70,30 T100,10 L100,100 Z"
                  fill={`url(#grad-${index})`}
                />
                <path
                  d="M0,80 Q20,70 40,60 T70,30 T100,10"
                  fill="none"
                  stroke={card.stroke}
                  strokeWidth="1.5"
                />
                <defs>
                  <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={card.stroke} stopOpacity="0.4" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={18} className={card.color} />
              </div>
              <p className="text-sm font-medium text-fg-secondary">{card.label}</p>
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-fg-primary mb-1">
                <AmountDisplay value={card.value} currency={data.currency} />
              </h2>

            </div>
          </div>
        ))}
      </div>

      {data.currencyBreakdownAvailable === false && (
        <p className="mt-3 text-xs text-status-warning">
          This saved snapshot predates currency-separated totals and will be corrected on its next refresh.
        </p>
      )}
      {otherCurrencies.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {otherCurrencies.map((item) => (
            <div
              key={item.currency}
              className="rounded-lg border border-border-subtle bg-bg-secondary px-4 py-3"
            >
              <p className="text-xs text-fg-secondary mb-1">
                Other currency · {item.currency}
              </p>
              <p className="text-base font-semibold text-fg-primary">
                <AmountDisplay value={item.totalNetWorth} currency={item.currency} />
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
