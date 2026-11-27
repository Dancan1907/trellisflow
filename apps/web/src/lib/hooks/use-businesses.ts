import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export type BusinessType =
  'RETAIL' | 'SERVICE' | 'FARMING' | 'FREELANCE' | 'MANUFACTURING' | 'OTHER';

export interface BusinessProfile {
  id: string;
  containerId: string;
  businessType: BusinessType;
  businessTypeCustom: string | null;
  startDate: string | null;
  notes: string | null;
  logoUrl: string | null;
}

export interface BusinessNetWorth {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  currency: string;
}

export interface BusinessSummary {
  id: string;
  name: string;
  type: 'INTERNAL_BUSINESS' | 'EXTERNAL_BUSINESS';
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  businessProfile: BusinessProfile | null;
  accountCount: number;
  netWorth: BusinessNetWorth;
  summaryCount?: number;
  latestSummary?: any;
}

export interface BusinessAccount {
  id: string;
  name: string;
  category: 'ASSET' | 'LIABILITY';
  accountType: string;
  currency: string;
  currentBalance: number;
  institution: string | null;
  status: string;
}

export interface BusinessDetail extends BusinessSummary {
  accounts: BusinessAccount[];
}

export interface PnlCategoryRow {
  categoryId: string | null;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
}

export interface BusinessPnlCurrency {
  currency: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  byCategory: PnlCategoryRow[];
}

export interface BusinessPnl {
  businessId: string;
  currency: string;
  from: string;
  to: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  byCategory: PnlCategoryRow[];
  byCurrency: BusinessPnlCurrency[];
}

export interface BusinessRunwayCurrency {
  currency: string;
  cashBalance: number;
  monthlyBurn: number;
  runwayMonths: number | null;
}

export interface BusinessRunway {
  businessId: string;
  currency: string;
  cashBalance: number;
  monthlyBurn: number;
  runwayMonths: number | null;
  byCurrency: BusinessRunwayCurrency[];
  windowDays: number;
  asOf: string;
}

export interface CreateBusinessInput {
  name: string;
  businessType: BusinessType;
  currency: string;
  type?: 'INTERNAL_BUSINESS' | 'EXTERNAL_BUSINESS';
  startDate?: string;
  notes?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  businessType?: BusinessType;
  notes?: string;
  logoUrl?: string;
}

export function useBusinesses() {
  return useQuery({
    queryKey: ['businesses'],
    queryFn: () => apiFetch<BusinessSummary[]>('/api/businesses'),
  });
}

export function useBusiness(id: string) {
  return useQuery({
    queryKey: ['businesses', id],
    queryFn: () => apiFetch<BusinessDetail>(`/api/businesses/${id}`),
    enabled: !!id,
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBusinessInput) =>
      apiFetch<BusinessSummary>('/api/businesses', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateBusinessInput) =>
      apiFetch<BusinessDetail>(`/api/businesses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['businesses', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useArchiveBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/businesses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useConvertBusinessToExternal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiFetch<{
        id: string;
        type: 'EXTERNAL_BUSINESS';
        seedSummary: { id: string; netWorth: number; currency: string };
      }>(`/api/businesses/${id}/convert-to-external`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useBusinessPnl(id: string) {
  return useQuery({
    queryKey: ['businesses', id, 'pnl'],
    queryFn: () => apiFetch<BusinessPnl>(`/api/businesses/${id}/pnl`),
    enabled: !!id,
  });
}

export function useBusinessRunway(id: string) {
  return useQuery({
    queryKey: ['businesses', id, 'runway'],
    queryFn: () => apiFetch<BusinessRunway>(`/api/businesses/${id}/runway`),
    enabled: !!id,
  });
}
