import { Building2, TrendingUp, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';

interface ContainerCard {
  id: string;
  name: string;
  type: string;
  currency: string;
  accountCount: number;
  netWorth: number;
  latestSummary?: {
    createdAt: string;
  };
}

interface ContainerCardsProps {
  isLoading: boolean;
  containers?: ContainerCard[];
}

export function ContainerCards({ isLoading, containers }: ContainerCardsProps) {
  if (isLoading || !containers) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-bg-secondary border border-border-subtle rounded-lg p-6 h-48">
            <Skeleton className="h-6 w-24 mb-6" />
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const getIcon = (type: string) => {
    if (type === 'INVESTMENT') return TrendingUp;
    if (type === 'INTERNAL_BUSINESS' || type === 'EXTERNAL_BUSINESS') return Building2;
    return User;
  };

  const getHref = (type: string, id: string) => {
    if (type === 'INVESTMENT') return '/investments';
    if (type === 'INTERNAL_BUSINESS' || type === 'EXTERNAL_BUSINESS') return `/businesses/${id}`;
    return '/personal';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {containers.map((card) => {
        const Icon = getIcon(card.type);
        const isExternal = card.type === 'EXTERNAL_BUSINESS';
        const isStale =
          isExternal &&
          (!card.latestSummary ||
            new Date().getTime() - new Date(card.latestSummary.createdAt).getTime() >
              30 * 24 * 60 * 60 * 1000);

        return (
          <Link
            key={card.id}
            href={getHref(card.type, card.id)}
            className="group bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-border-strong hover:bg-bg-tertiary transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-bg-tertiary group-hover:bg-bg-secondary transition-colors">
                  <Icon size={20} className="text-accent-primary" />
                </div>
                <h3 className="font-medium text-fg-primary">{card.name}</h3>
              </div>
              {isStale && (
                <span className="bg-status-warning/10 text-status-warning text-xs px-2 py-1 rounded font-medium">
                  Needs Update
                </span>
              )}
            </div>

            <p className="text-2xl font-semibold text-fg-primary mb-1">
              <AmountDisplay value={card.netWorth} currency={card.currency} />
            </p>
            <p className="text-xs text-fg-secondary mb-4">{card.accountCount} accounts</p>

            <div className="flex items-center text-xs font-medium text-accent-primary group-hover:translate-x-1 transition-transform">
              View details <ArrowRight size={14} className="ml-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
