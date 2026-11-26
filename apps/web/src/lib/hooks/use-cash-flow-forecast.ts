import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/api-client';

export interface CashFlowForecastPoint {
  date: string;
  projectedBalance: number;
  lowerBound: number;
  upperBound: number;
  recurringNet: number;
  knownScheduledNet: number;
  historicalBaselineNet: number;
}

export interface CashFlowForecastAccount {
  accountId: string;
  accountName: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  points: CashFlowForecastPoint[];
}

export interface CashFlowForecastData {
  asOf: string;
  horizonDays: number;
  historyDays: number;
  accounts: CashFlowForecastAccount[];
  warnings: string[];
  assumptions: string[];
  backtesting: Array<{
    currency: string;
    sampleCount: number;
    meanAbsoluteErrorPerDay: number | null;
    meanAbsolutePercentageError: number | null;
    methodology: string;
  }>;
  generatedAt: string;
  scope: {
    accountCount: number;
    recurringRuleCount: number;
    transactionCount: number;
    currencies: string[];
  };
}

export function useCashFlowForecast(options: {
  horizonDays: number;
  historyDays: number;
  incomeAdjustmentPercent: number;
  expenseAdjustmentPercent: number;
}) {
  const params = new URLSearchParams({
    horizonDays: String(options.horizonDays),
    historyDays: String(options.historyDays),
    incomeAdjustmentPercent: String(options.incomeAdjustmentPercent),
    expenseAdjustmentPercent: String(options.expenseAdjustmentPercent),
  });
  return useQuery({
    queryKey: ['reports', 'cash-flow-forecast', options],
    queryFn: () => apiFetch<CashFlowForecastData>(`/api/forecasts/cash-flow?${params.toString()}`),
  });
}
