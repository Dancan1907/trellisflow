'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight, TrendingUp, PlusCircle, BarChart3, Wallet, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/auth-store';
import {
  useDashboardSummary,
  useDashboardContainers,
  useDashboardInsights,
} from '@/lib/hooks/use-dashboard';
import { HeroCard } from '@/components/features/dashboard/hero-card';
import { ContainerCards } from '@/components/features/dashboard/container-cards';
import { CashFlowWidget } from '@/components/features/dashboard/cash-flow-widget';
import { InsightsWidget } from '@/components/features/dashboard/insights-widget';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [selectedDays, setSelectedDays] = useState(30);
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const rangeOptions = [
    { days: 7, label: 'Last 7 days' },
    { days: 30, label: 'Last 30 days' },
    { days: 90, label: 'Last 90 days' },
    { days: 365, label: 'Last 12 months' },
  ];
  const selectedRangeLabel = rangeOptions.find((option) => option.days === selectedDays)?.label ?? 'Last 30 days';
  const { data: summary, isLoading: isLoadingSummary } = useDashboardSummary(selectedDays);
  const { data: containers, isLoading: isLoadingContainers } = useDashboardContainers();
  const { data: insights, isLoading: isLoadingInsights } = useDashboardInsights();

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-fg-primary mb-1">
            Good evening, {firstName}!
          </h1>
          <p className="text-fg-secondary text-sm">
            Here&apos;s your financial snapshot for today.
          </p>
        </div>
        <div className="relative w-fit">
          <button
            type="button"
            aria-label="Filter cash flow activity period"
            title="Filter cash flow activity period"
            aria-haspopup="listbox"
            aria-expanded={isRangeMenuOpen}
            onClick={() => setIsRangeMenuOpen((open) => !open)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-subtle bg-bg-secondary text-sm font-medium text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <Calendar size={16} />
            {selectedRangeLabel}
            <span aria-hidden="true" className="text-xs">▾</span>
          </button>
          {isRangeMenuOpen && (
            <div
              role="listbox"
              aria-label="Dashboard activity period"
              className="absolute right-0 top-full z-30 mt-2 min-w-44 overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary p-1 shadow-xl"
            >
              {rangeOptions.map((option) => (
                <button
                  key={option.days}
                  type="button"
                  role="option"
                  aria-selected={selectedDays === option.days}
                  onClick={() => {
                    setSelectedDays(option.days);
                    setIsRangeMenuOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-bg-tertiary ${selectedDays === option.days ? 'bg-accent-primary/10 text-accent-primary font-semibold' : 'text-fg-secondary'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side (Takes 3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Row 1: Metric Cards */}
          <HeroCard isLoading={isLoadingSummary} data={summary?.netWorth} />

          {/* Row 2: Portfolio & Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContainerCards
              isLoading={isLoadingContainers}
              containers={containers}
              reportingCurrency={summary?.netWorth.currency ?? 'KES'}
            />
            <CashFlowWidget isLoading={isLoadingSummary} data={summary?.cashFlow} periodLabel={selectedRangeLabel} />
          </div>

          {/* Useful shortcuts fill the dashboard's lower-left space without duplicating insights. */}
          <section className="rounded-xl border border-border-subtle bg-bg-secondary p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-fg-primary">Quick actions</h2>
              <p className="mt-1 text-xs text-fg-secondary">Jump straight to the tools you use most.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Add transaction', href: '/personal', icon: PlusCircle },
                { label: 'View accounts', href: '/personal', icon: Wallet },
                { label: 'Open reports', href: '/reports', icon: BarChart3 },
                { label: 'Money Copilot', href: '/money-copilot', icon: Sparkles },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-3 text-sm font-medium text-fg-secondary transition-colors hover:border-accent-primary hover:text-fg-primary"
                >
                  <action.icon size={17} className="shrink-0 text-accent-primary" />
                  <span className="min-w-0">{action.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right Side (Takes 1 column) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Grow Wealth Promo */}
          <div className="bg-gradient-to-b from-bg-secondary to-bg-primary border border-border-subtle rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/10 blur-2xl rounded-full group-hover:bg-accent-primary/20 transition-all" />
            <div className="w-12 h-12 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-6">
              <TrendingUp className="text-accent-primary" size={24} />
            </div>
            <h3 className="text-xl font-display font-bold text-fg-primary mb-2 leading-tight">
              Grow your wealth
              <br />
              with confidence
            </h3>
            <p className="text-sm text-fg-secondary mb-6">
              Track. Plan. Invest. Let TrellisFlow guide your financial journey.
            </p>
            <Link href="/insights" className="w-full py-2.5 rounded-md bg-accent-primary text-bg-primary text-sm font-bold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2">
              Explore Insights <ArrowRight size={16} />
            </Link>
          </div>

          {/* Insights Widget */}
          <InsightsWidget isLoading={isLoadingInsights} insights={insights} />
        </div>
      </div>
    </div>
  );
}
