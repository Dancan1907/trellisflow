export type ProjectionStatus = 'ACHIEVED' | 'ON_TRACK' | 'BEHIND' | 'NO_TARGET_DATE' | 'NO_DATA';

export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  amount: number; // cumulative saved amount at end of that day
}

export interface Projection {
  status: ProjectionStatus;
  /** Net saved per day over the recent window. */
  dailyRate: number;
  projectedCompletionDate: string | null;
  /** Positive = ahead of targetDate, negative = late. */
  daysAhead: number | null;
  /** Amount per month needed to hit targetDate (null if no future date). */
  requiredMonthly: number | null;
}

const DAY_MS = 86_400_000;
const MAX_PROJECTION_DAYS = 3650; // beyond ~10 years a projection is noise
const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeProjection(input: {
  currentAmount: number;
  targetAmount: number;
  targetDate: Date | null;
  dailyRate: number;
  now?: Date;
}): Projection {
  const now = input.now ?? new Date();
  const { currentAmount, targetAmount, targetDate, dailyRate } = input;
  const remaining = targetAmount - currentAmount;

  let requiredMonthly: number | null = null;
  if (remaining > 0 && targetDate) {
    const daysLeft = (targetDate.getTime() - now.getTime()) / DAY_MS;
    if (daysLeft > 0) requiredMonthly = round2((remaining / daysLeft) * 30.4375);
  }

  const base = { dailyRate: round2(dailyRate), requiredMonthly };

  if (targetAmount > 0 && remaining <= 0) {
    return { ...base, status: 'ACHIEVED', projectedCompletionDate: null, daysAhead: null };
  }

  if (dailyRate <= 0) {
    return { ...base, status: 'NO_DATA', projectedCompletionDate: null, daysAhead: null };
  }

  const daysNeeded = Math.ceil(remaining / dailyRate);
  if (daysNeeded > MAX_PROJECTION_DAYS) {
    return { ...base, status: 'NO_DATA', projectedCompletionDate: null, daysAhead: null };
  }

  const projected = new Date(now.getTime() + daysNeeded * DAY_MS);
  const projectedCompletionDate = projected.toISOString().slice(0, 10);

  if (!targetDate) {
    return { ...base, status: 'NO_TARGET_DATE', projectedCompletionDate, daysAhead: null };
  }

  const daysAhead = Math.ceil((targetDate.getTime() - projected.getTime()) / DAY_MS);
  return {
    ...base,
    status: daysAhead < 0 ? 'BEHIND' : 'ON_TRACK',
    projectedCompletionDate,
    daysAhead,
  };
}

/**
 * Net saved per day over the last `windowDays`.
 * `history` must be sorted ascending. Idle days since the last point count as zero
 * savings, so a goal that stopped growing sees its rate decay honestly.
 */
export function recentDailyRate(
  history: HistoryPoint[],
  currentAmount: number,
  windowDays = 90,
  now: Date = new Date(),
): number {
  if (history.length === 0) return 0;
  const windowStartIso = new Date(now.getTime() - windowDays * DAY_MS).toISOString().slice(0, 10);

  let start = history[0]!;
  for (const p of history) {
    if (p.date <= windowStartIso) start = p;
    else break;
  }

  const days = Math.max(1, (now.getTime() - new Date(start.date).getTime()) / DAY_MS);
  return (currentAmount - start.amount) / days;
}
