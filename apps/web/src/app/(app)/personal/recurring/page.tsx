'use client';

import { useState } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRecurringRules, useUpcomingBills } from '@/lib/hooks/use-recurring';
import { CreateRuleModal } from '@/components/features/recurring/create-rule-modal';
import { AmountDisplay } from '@/components/shared/amount-display';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';

export default function RecurringPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: rules, isLoading } = useRecurringRules();
  const { data: upcoming } = useUpcomingBills();
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg-primary mb-1">Recurring Rules</h1>
          <p className="text-fg-secondary text-sm">Manage your automatic income and bills.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={18} /> Add Rule
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border-subtle">
        <Link
          href="/personal"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Accounts
        </Link>
        <Link
          href="/personal/categories"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal/categories' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Categories
        </Link>
        <Link
          href="/personal/recurring"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/personal/recurring' ? 'border-accent-primary text-fg-primary' : 'border-transparent text-fg-secondary hover:text-fg-primary'}`}
        >
          Recurring
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-medium text-fg-primary">All Rules</h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 bg-bg-secondary border border-border-subtle rounded-lg"
                >
                  <div>
                    <p className="font-medium text-fg-primary">{rule.description}</p>
                    <p className="text-xs text-fg-secondary flex items-center gap-1 mt-1">
                      <Clock size={12} /> {rule.frequency} • Next:{' '}
                      {new Date(rule.nextOccurrence).toLocaleDateString()}
                    </p>
                  </div>
                  <AmountDisplay
                    value={rule.amount}
                    currency={rule.currency}
                    colorize={rule.type === 'INCOME'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No recurring rules"
              description="Create a rule to automate your rent, salary, or subscriptions."
            />
          )}
        </div>

        {/* Right: Upcoming Bills Widget */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-medium text-fg-primary mb-4">Upcoming (30 days)</h2>
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4 space-y-3">
            {upcoming && upcoming.length > 0 ? (
              upcoming.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between text-sm border-b border-border-subtle last:border-0 pb-2 last:pb-0"
                >
                  <div>
                    <p className="text-fg-primary">{u.description}</p>
                    <p className="text-xs text-fg-secondary">
                      {new Date(u.nextOccurrence).toLocaleDateString()}
                    </p>
                  </div>
                  <AmountDisplay value={u.amount} currency={u.currency} />
                </div>
              ))
            ) : (
              <p className="text-sm text-fg-secondary text-center py-4">No upcoming bills.</p>
            )}
          </div>
        </div>
      </div>

      <CreateRuleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
