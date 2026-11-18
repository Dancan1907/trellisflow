'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, Plus } from 'lucide-react';
import { useBusinesses } from '@/lib/hooks/use-businesses';
import { CreateBusinessModal } from '@/components/features/businesses/create-business-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_LABELS: Record<string, string> = {
  RETAIL: 'Retail',
  SERVICE: 'Service',
  FARMING: 'Farming',
  FREELANCE: 'Freelance',
  MANUFACTURING: 'Manufacturing',
  OTHER: 'Other',
};

export default function BusinessesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: businesses, isLoading } = useBusinesses();

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Businesses</h1>
          <p className="text-fg-secondary text-sm">
            Track the money moving through your businesses — accounts, P&amp;L, and runway.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={18} /> New Business
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      ) : businesses && businesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((business) => (
            <Link
              key={business.id}
              href={`/businesses/${business.id}`}
              className="group bg-bg-secondary border border-border-subtle rounded-lg p-6 hover:border-border-strong hover:bg-bg-tertiary transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-bg-tertiary group-hover:bg-bg-secondary transition-colors">
                    <Building2 size={20} className="text-accent-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-fg-primary">{business.name}</h3>
                    <p className="text-xs text-fg-secondary">
                      {TYPE_LABELS[business.businessProfile?.businessType ?? 'OTHER'] ?? 'Business'}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-fg-tertiary group-hover:text-fg-primary group-hover:translate-x-0.5 transition-all"
                />
              </div>

              <p className="text-xs font-medium text-fg-secondary uppercase tracking-wider mb-1">
                Net Worth
              </p>
              <p className="text-2xl font-semibold text-fg-primary mb-3">
                <AmountDisplay
                  value={business.netWorth.netWorth}
                  currency={business.currency}
                  colorize
                />
              </p>
              <p className="text-xs text-fg-secondary">
                {business.accountCount} {business.accountCount === 1 ? 'account' : 'accounts'}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No businesses yet"
          description="Add a business to track its accounts, profit & loss, net worth, and cash runway."
          action={
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Create Your First Business
            </button>
          }
        />
      )}

      <CreateBusinessModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
