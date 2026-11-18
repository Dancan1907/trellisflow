import { Summary } from '@prisma/client';

export interface SerializedSummary {
  id: string;
  containerId: string;
  unit: string | null;
  date: string;
  period: string;
  periodStart: string | null;
  periodEnd: string | null;
  income: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
  cashBalance: number;
  assetsValue: number;
  liabilitiesValue: number;
  netWorth: number;
  currency: string;
  notes: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Formats a `DATE` column value as `YYYY-MM-DD` (values are UTC midnight). */
export function formatSummaryDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Rounds to 2 decimal places without binary floating-point noise. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Converts Prisma Decimals and Dates into a plain JSON shape the web app can
 * consume directly. Net worth is derived (assets − liabilities), never stored.
 */
export function serializeSummary(summary: Summary): SerializedSummary {
  const assetsValue = Number(summary.assetsValue);
  const liabilitiesValue = Number(summary.liabilitiesValue);

  return {
    id: summary.id,
    containerId: summary.containerId,
    unit: summary.unit,
    date: formatSummaryDate(summary.date),
    period: summary.period,
    periodStart: summary.periodStart ? formatSummaryDate(summary.periodStart) : null,
    periodEnd: summary.periodEnd ? formatSummaryDate(summary.periodEnd) : null,
    income: Number(summary.income),
    expenses: Number(summary.expenses),
    transfersIn: Number(summary.transfersIn),
    transfersOut: Number(summary.transfersOut),
    cashBalance: Number(summary.cashBalance),
    assetsValue,
    liabilitiesValue,
    netWorth: roundMoney(assetsValue - liabilitiesValue),
    currency: summary.currency,
    notes: summary.notes,
    source: summary.source,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}
