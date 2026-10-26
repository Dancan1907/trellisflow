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
  };
  cashFlow: {
    income: number;
    expenses: number;
    net: number;
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
  lastUpdatedAt: string;
}

interface Insight {
  id: string;
  type: string;
  severity: 'INFO' | 'OPPORTUNITY' | 'WARNING';
  title: string;
  message: string;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiFetch<DashboardSummary>('/api/dashboard/summary'),
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
  });
}
