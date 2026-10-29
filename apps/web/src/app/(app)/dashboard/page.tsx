'use client';

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
  const { data: summary, isLoading: isLoadingSummary } = useDashboardSummary();
  const { data: containers, isLoading: isLoadingContainers } = useDashboardContainers();
  const { data: insights, isLoading: isLoadingInsights } = useDashboardInsights();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg-primary mb-1">Dashboard</h1>
        <p className="text-fg-secondary text-sm">Your entire financial world in one place.</p>
      </div>

      {/* Hero & Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HeroCard isLoading={isLoadingSummary} data={summary?.netWorth} />
        </div>
        <div className="lg:col-span-1">
          <CashFlowWidget isLoading={isLoadingSummary} data={summary?.cashFlow} />
        </div>
      </div>

      {/* Container Cards */}
      <div>
        <h2 className="text-lg font-medium text-fg-primary mb-4">Your Containers</h2>
        <ContainerCards isLoading={isLoadingContainers} containers={containers} />
      </div>

      {/* Insights */}
      <div>
        <h2 className="text-lg font-medium text-fg-primary mb-4">Insights</h2>
        <InsightsWidget isLoading={isLoadingInsights} insights={insights} />
      </div>
    </div>
  );
}
