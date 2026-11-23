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
      label: 'Total Net Worth',
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-bg-secondary border border-border-subtle rounded-xl p-5 relative overflow-hidden group hover:border-border-strong transition-colors"
        >
          {/* Mini Sparkline Background */}
          <div className="absolute bottom-0 left-0 w-full h-12 opacity-30 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path
                d="M0,100 L0,80 Q20,70 40,60 T70,30 T100,10 L100,100 Z"
                fill={`url(#grad-${i})`}
              />
              <path
                d="M0,80 Q20,70 40,60 T70,30 T100,10"
                fill="none"
                stroke={card.stroke}
                strokeWidth="1.5"
              />
              <defs>
                <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
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
            <p className="text-xs text-accent-primary flex items-center gap-1 font-medium">
              <TrendingUp size={12} /> +0% vs last month
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
