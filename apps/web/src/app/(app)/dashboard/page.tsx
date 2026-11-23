'use client';

import { Calendar, ArrowRight, TrendingUp } from 'lucide-react';
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
  const { data: summary, isLoading: isLoadingSummary } = useDashboardSummary();
  const { data: containers, isLoading: isLoadingContainers } = useDashboardContainers();
  const { data: insights, isLoading: isLoadingInsights } = useDashboardInsights();

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-fg-primary mb-1 flex items-center gap-2">
            Good evening, {firstName}! <span className="text-2xl">👋</span>
          </h1>
          <p className="text-fg-secondary text-sm">
            Here&apos;s your financial snapshot for today.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-subtle bg-bg-secondary text-sm font-medium text-fg-secondary hover:text-fg-primary transition-colors w-fit">
          <Calendar size={16} />
          Last 30 days
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side (Takes 3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Row 1: Metric Cards */}
          <HeroCard isLoading={isLoadingSummary} data={summary?.netWorth} />

          {/* Row 2: Portfolio & Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContainerCards isLoading={isLoadingContainers} containers={containers} />
            <CashFlowWidget isLoading={isLoadingSummary} data={summary?.cashFlow} />
          </div>
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
            <button className="w-full py-2.5 rounded-md bg-accent-primary text-bg-primary text-sm font-bold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2">
              Explore Insights <ArrowRight size={16} />
            </button>
          </div>

          {/* Insights Widget */}
          <InsightsWidget isLoading={isLoadingInsights} insights={insights} />
        </div>
      </div>
    </div>
  );
}
