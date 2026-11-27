import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

// Types based on our backend response
interface DashboardSummary {
  netWorth: {
    total: number;
    personal: number;
    investments: number;
    businesses: number;
    currency: string;
    currencyBreakdownAvailable: boolean;
    byCurrency: Array<{
      currency: string;
      totalNetWorth: number;
      personalNetWorth: number;
      investmentsNetWorth: number;
      businessesNetWorth: number;
    }>;
  };
  cashFlow: {
    income: number;
    expenses: number;
    net: number;
    currency: string;
    byCurrency: Array<{
      currency: string;
      income: number;
      expenses: number;
      net: number;
    }>;
    periodStart: string;
    periodEnd: string;
  };
}

interface ContainerCard {
  id: string;
  name: string;
  type: string;
  currency: string;
  accountCount: number;
  netWorth: number;
  byCurrency: Array<{ currency: string; netWorth: number }>;
  lastUpdatedAt: string;
}

interface Insight {
  id: string;
  type: string;
  severity: 'INFO' | 'OPPORTUNITY' | 'WARNING';
  title: string;
  message: string;
  narrative?: string | null;
  narrationStatus?: 'NOT_REQUESTED' | 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';
  actionUrl?: string | null;
}

export function useDashboardSummary(days: number = 30) {
  return useQuery({
    queryKey: ['dashboard', 'summary', days],
    queryFn: () => apiFetch<DashboardSummary>(`/api/dashboard/summary?days=${days}`),
  });
}

export function useDashboardContainers() {
  return useQuery({
    queryKey: ['dashboard', 'containers'],
    queryFn: () => apiFetch<ContainerCard[]>('/api/dashboard/containers'),
  });
}

export function useDashboardInsights() {
  return useQuery({
    queryKey: ['dashboard', 'insights'],
    queryFn: () => apiFetch<Insight[]>('/api/dashboard/insights'),
    refetchInterval: 15000,
  });
}
