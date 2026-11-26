export type ForecastTransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type ForecastFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

export interface ForecastAccountInput {
  id: string;
  name: string;
  currency: string;
  currentBalance: string | number;
}

export interface ForecastRuleInput {
  id: string;
  accountId: string;
  transferToAccountId: string | null;
  type: ForecastTransactionType;
  amount: string | number;
  currency: string;
  description: string;
  frequency: ForecastFrequency;
  interval: number;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  nextOccurrence: Date | string;
  endDate: Date | string | null;
  status: string;
}

export interface ForecastTransactionInput {
  accountId: string;
  type: ForecastTransactionType;
  amount: string | number;
  date: Date | string;
  recurringRuleId: string | null;
  status: string;
}

export interface ForecastPoint {
  date: string;
  projectedBalance: number;
  lowerBound: number;
  upperBound: number;
  recurringNet: number;
  knownScheduledNet: number;
  historicalBaselineNet: number;
}

export interface AccountForecast {
  accountId: string;
  accountName: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  points: ForecastPoint[];
}

export interface CashFlowForecastInput {
  asOf: Date;
  horizonDays: number;
  historyDays: number;
  accounts: ForecastAccountInput[];
  rules: ForecastRuleInput[];
  transactions: ForecastTransactionInput[];
  incomeAdjustmentPercent?: number;
  expenseAdjustmentPercent?: number;
}

const SCALE = 10_000n;
const DAY_MS = 86_400_000;

function toUnits(value: string | number): bigint {
  const raw = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error('Invalid monetary amount');
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ''] = unsigned.split('.');
  const units = BigInt(whole!) * SCALE + BigInt((fraction + '0000').slice(0, 4));
  return negative ? -units : units;
}

function money(value: bigint): number {
  return Number(value) / Number(SCALE);
}

function day(value: Date | string): Date {
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
}

function iso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, count: number): Date {
  return new Date(value.getTime() + count * DAY_MS);
}

function addMonthsClamped(value: Date, count: number): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + count;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(value.getUTCDate(), lastDay)));
}

function nextDate(value: Date, frequency: ForecastFrequency, interval: number): Date | null {
  if (!Number.isInteger(interval) || interval < 1) return null;
  switch (frequency) {
    case 'DAILY': return addDays(value, interval);
    case 'WEEKLY': return addDays(value, 7 * interval);
    case 'BIWEEKLY': return addDays(value, 14 * interval);
    case 'MONTHLY': return addMonthsClamped(value, interval);
    case 'QUARTERLY': return addMonthsClamped(value, 3 * interval);
    case 'YEARLY': return addMonthsClamped(value, 12 * interval);
    default: return null;
  }
}

function nextRuleDate(value: Date, rule: ForecastRuleInput): Date | null {
  if (!Number.isInteger(rule.interval) || rule.interval < 1) return null;
  if (rule.frequency === 'MONTHLY' || rule.frequency === 'QUARTERLY' || rule.frequency === 'YEARLY') {
    const months = rule.frequency === 'MONTHLY' ? rule.interval : rule.frequency === 'QUARTERLY' ? 3 * rule.interval : 12 * rule.interval;
    const target = addMonthsClamped(value, months);
    const intendedDay = rule.dayOfMonth ?? day(rule.nextOccurrence).getUTCDate();
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(intendedDay, lastDay)));
  }
  if (rule.frequency === 'WEEKLY' || rule.frequency === 'BIWEEKLY') {
    const step = (rule.frequency === 'WEEKLY' ? 7 : 14) * rule.interval;
    const target = addDays(value, step);
    if (rule.dayOfWeek == null) return target;
    const delta = (rule.dayOfWeek - target.getUTCDay() + 7) % 7;
    return addDays(target, delta);
  }
  return nextDate(value, rule.frequency, rule.interval);
}

function signedTransactionAmount(type: ForecastTransactionType, amount: bigint): bigint {
  if (type === 'INCOME') return amount < 0n ? -amount : amount;
  if (type === 'EXPENSE') return amount < 0n ? amount : -amount;
  return amount;
}

function percentFactor(percent: number): bigint {
  return BigInt(Math.round((100 + percent) * 100));
}

function adjusted(value: bigint, factor: bigint): bigint {
  return (value * factor) / 10_000n;
}

interface AccountAccumulator {
  account: ForecastAccountInput;
  balance: bigint;
  historyIncome: bigint;
  historyExpense: bigint;
  historyTransactionCount: number;
  dailyNet: bigint[];
  uncertainty: number;
  recurringByDate: Map<string, bigint>;
  knownByDate: Map<string, bigint>;
}

export function computeCashFlowForecast(input: CashFlowForecastInput): {
  asOf: string;
  horizonDays: number;
  historyDays: number;
  accounts: AccountForecast[];
  warnings: string[];
  assumptions: string[];
} {
  if (!Number.isInteger(input.horizonDays) || input.horizonDays < 1 || input.horizonDays > 365) {
    throw new Error('Forecast horizon must be between 1 and 365 days');
  }
  if (!Number.isInteger(input.historyDays) || input.historyDays < 30 || input.historyDays > 365) {
    throw new Error('Historical window must be between 30 and 365 days');
  }
  const incomeAdjustment = input.incomeAdjustmentPercent ?? 0;
  const expenseAdjustment = input.expenseAdjustmentPercent ?? 0;
  if (incomeAdjustment < -100 || incomeAdjustment > 1_000 || expenseAdjustment < -100 || expenseAdjustment > 1_000) {
    throw new Error('Scenario adjustments must be between -100% and 1000%');
  }

  const asOf = day(input.asOf);
  const endDate = addDays(asOf, input.horizonDays);
  const historyStart = addDays(asOf, -input.historyDays);
  const warnings: string[] = [];
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const accumulators = new Map<string, AccountAccumulator>();

  for (const account of input.accounts) {
    accumulators.set(account.id, {
      account,
      balance: toUnits(account.currentBalance),
      historyIncome: 0n,
      historyExpense: 0n,
      historyTransactionCount: 0,
      dailyNet: Array.from({ length: input.historyDays }, () => 0n),
      uncertainty: 0,
      recurringByDate: new Map(),
      knownByDate: new Map(),
    });
  }

  for (const transaction of input.transactions) {
    const date = day(transaction.date);
    const accumulator = accumulators.get(transaction.accountId);
    if (!accumulator) continue;
    const posted = ['POSTED', 'RECONCILED'].includes(transaction.status);
    const pending = transaction.status === 'PENDING';
    const amount = toUnits(transaction.amount);
    const signed = transaction.type === 'TRANSFER'
      ? amount
      : signedTransactionAmount(transaction.type, amount);

    // Cached balances are updated when posted transactions are created, even
    // when their effective date is in the future. Rewind those movements to
    // derive the balance at asOf, then add each future movement exactly once.
    if (posted && date > asOf) accumulator.balance -= signed;

    // Scheduled movements must be replayed even when they are transfers or
    // were generated from a recurring rule. The rule's nextOccurrence has
    // already advanced when its transaction is generated.
    if ((posted || pending) && date > asOf && date <= endDate) {
      const key = iso(date);
      accumulator.knownByDate.set(key, (accumulator.knownByDate.get(key) ?? 0n) + signed);
    }

    if (transaction.recurringRuleId || transaction.type === 'TRANSFER') continue;
    if (posted && date >= historyStart && date <= asOf) {
      if (transaction.type === 'INCOME') accumulator.historyIncome += signed;
      if (transaction.type === 'EXPENSE') accumulator.historyExpense += -signed;
      accumulator.historyTransactionCount++;
      const index = Math.floor((date.getTime() - historyStart.getTime()) / DAY_MS);
      if (index >= 0 && index < input.historyDays) {
        accumulator.dailyNet[index] = (accumulator.dailyNet[index] ?? 0n) + signed;
      }
    }
  }

  const incomeFactor = percentFactor(incomeAdjustment);
  const expenseFactor = percentFactor(expenseAdjustment);
  for (const accumulator of accumulators.values()) {
    if (accumulator.historyTransactionCount === 0) {
      warnings.push(`No eligible historical income or expense transactions were found for account "${accumulator.account.name}"; its variable-flow baseline and uncertainty band may understate risk.`);
    }
    const mean = accumulator.dailyNet.reduce((sum, value) => sum + Number(value), 0) / accumulator.dailyNet.length;
    const variance = accumulator.dailyNet.reduce((sum, value) => sum + (Number(value) - mean) ** 2, 0) / Math.max(1, accumulator.dailyNet.length - 1);
    accumulator.uncertainty = Math.sqrt(variance);
  }

  for (const rule of input.rules) {
    if (rule.status !== 'ACTIVE') continue;
    const source = accumulators.get(rule.accountId);
    if (!source) continue;
    if (rule.currency !== source.account.currency) {
      warnings.push(`Recurring rule "${rule.description}" uses a different currency from its source account and was excluded.`);
      continue;
    }
    if (rule.frequency === 'CUSTOM') {
      warnings.push(`Recurring rule "${rule.description}" uses a custom frequency and was excluded because its schedule cannot be projected safely.`);
      continue;
    }
    if (!Number.isInteger(rule.interval) || rule.interval < 1) {
      warnings.push(`Recurring rule "${rule.description}" has an invalid interval and was excluded.`);
      continue;
    }
    if (rule.type === 'TRANSFER') {
      const destination = rule.transferToAccountId ? accumulators.get(rule.transferToAccountId) : undefined;
      if (!destination || destination.account.currency !== source.account.currency || destination.account.id === source.account.id) {
        warnings.push(`Recurring transfer "${rule.description}" was excluded because its destination is missing, identical, or uses a different currency.`);
        continue;
      }
    }

    const lastDate = rule.endDate ? day(rule.endDate) : endDate;
    let occurrence = day(rule.nextOccurrence);
    let guard = 0;
    while (occurrence < asOf && guard++ < 5_000) {
      const next = nextRuleDate(occurrence, rule);
      if (!next || next.getTime() <= occurrence.getTime()) break;
      occurrence = next;
    }
    while (occurrence <= endDate && occurrence <= lastDate && guard++ < 5_000) {
      if (occurrence > asOf) {
        const dateKey = iso(occurrence);
        const amount = toUnits(rule.amount);
        const signed = rule.type === 'TRANSFER' ? -amount : signedTransactionAmount(rule.type, amount);
        source.recurringByDate.set(dateKey, (source.recurringByDate.get(dateKey) ?? 0n) + signed);
        if (rule.type === 'TRANSFER' && rule.transferToAccountId) {
          const destination = accumulators.get(rule.transferToAccountId)!;
          destination.recurringByDate.set(dateKey, (destination.recurringByDate.get(dateKey) ?? 0n) - signed);
        }
      }
      const next = nextRuleDate(occurrence, rule);
      if (!next || next.getTime() <= occurrence.getTime()) break;
      occurrence = next;
    }
    if (guard >= 5_000) warnings.push(`Recurring rule "${rule.description}" exceeded the safe occurrence limit and was truncated.`);
  }

  const accounts: AccountForecast[] = [];
  for (const accumulator of accumulators.values()) {
    const points: ForecastPoint[] = [];
    let balance = accumulator.balance;
    const averageIncome = adjusted(accumulator.historyIncome / BigInt(input.historyDays), incomeFactor);
    const averageExpense = adjusted(accumulator.historyExpense / BigInt(input.historyDays), expenseFactor);
    for (let offset = 1; offset <= input.horizonDays; offset++) {
      const date = addDays(asOf, offset);
      const key = iso(date);
      const recurringNet = accumulator.recurringByDate.get(key) ?? 0n;
      const knownScheduledNet = accumulator.knownByDate.get(key) ?? 0n;
      const historicalBaselineNet = averageIncome - averageExpense;
      balance += recurringNet + knownScheduledNet + historicalBaselineNet;
      const uncertainty = BigInt(Math.round(1.28 * accumulator.uncertainty * Math.sqrt(offset)));
      points.push({
        date: key,
        projectedBalance: money(balance),
        lowerBound: money(balance - uncertainty),
        upperBound: money(balance + uncertainty),
        recurringNet: money(recurringNet),
        knownScheduledNet: money(knownScheduledNet),
        historicalBaselineNet: money(historicalBaselineNet),
      });
    }
    accounts.push({
      accountId: accumulator.account.id,
      accountName: accumulator.account.name,
      currency: accumulator.account.currency,
      openingBalance: money(accumulator.balance),
      closingBalance: money(balance),
      points,
    });
  }

  if (input.rules.some((rule) => rule.status === 'ACTIVE' && rule.frequency === 'CUSTOM')) {
    warnings.push('Custom recurrence schedules are not included in this forecast.');
  }
  return {
    asOf: iso(asOf),
    horizonDays: input.horizonDays,
    historyDays: input.historyDays,
    accounts,
    warnings: [...new Set(warnings)],
    assumptions: [
      'Opening balances are reconstructed at the selected as-of date by reversing posted or reconciled transactions dated after that date from the cached account balance.',
      'Posted and reconciled historical income and expenses establish a straight-line daily baseline over the selected lookback window.',
      'Transactions linked to recurring rules are excluded from the historical baseline to avoid double counting.',
      'Active recurring rules are projected from their stored next occurrence; paused and ended rules are excluded.',
      'Transfers move value between same-currency accounts and are not treated as income or expense.',
      'Future-dated posted, reconciled, and pending transactions are included once as known scheduled cash movements; posted movements are first removed from the cached opening balance.',
      'The uncertainty band is an indicative 80% interval derived from historical daily net-flow variability, not a guarantee.',
      'Each currency is forecast independently; balances in different currencies are never added together.',
      'Scenario adjustments apply only to the historical variable-income and variable-expense baseline, not to fixed recurring rules.',
    ],
  };
}

/**
 * Backtests the historical variable-flow baseline using rolling 30-day origins
 * and 7-day forecast windows. Recurring-rule transactions and transfers are
 * excluded because historical rule versions are not retained.
 */
export function backtestVariableCashFlow(input: {
  transactions: ForecastTransactionInput[];
  accountIds: string[];
  asOf: Date;
  historyDays?: number;
}): {
  sampleCount: number;
  meanAbsoluteErrorPerDay: number | null;
  meanAbsolutePercentageError: number | null;
  methodology: string;
} {
  const historyDays = input.historyDays ?? 180;
  const start = addDays(day(input.asOf), -historyDays);
  const byDay = new Map<string, bigint>();
  for (const transaction of input.transactions) {
    if (!input.accountIds.includes(transaction.accountId) || transaction.recurringRuleId) continue;
    if (!['POSTED', 'RECONCILED'].includes(transaction.status) || transaction.type === 'TRANSFER') continue;
    const date = day(transaction.date);
    if (date < start || date >= day(input.asOf)) continue;
    const key = iso(date);
    const signed = signedTransactionAmount(transaction.type, toUnits(transaction.amount));
    byDay.set(key, (byDay.get(key) ?? 0n) + signed);
  }

  const daily: bigint[] = [];
  for (let i = 0; i < historyDays; i++) daily.push(byDay.get(iso(addDays(start, i))) ?? 0n);
  const errors: number[] = [];
  const percentageErrors: number[] = [];
  for (let origin = 30; origin + 7 <= daily.length; origin += 7) {
    const training = daily.slice(origin - 30, origin);
    const average = training.reduce((sum, value) => sum + Number(value), 0) / 30;
    const actual = daily.slice(origin, origin + 7).reduce((sum, value) => sum + Number(value), 0);
    const predicted = average * 7;
    errors.push(Math.abs(actual - predicted) / 7 / Number(SCALE));
    if (Math.abs(actual) > 0) percentageErrors.push(Math.abs(actual - predicted) / Math.abs(actual) * 100);
  }

  return {
    sampleCount: errors.length,
    meanAbsoluteErrorPerDay: errors.length ? Number((errors.reduce((sum, value) => sum + value, 0) / errors.length).toFixed(4)) : null,
    meanAbsolutePercentageError: percentageErrors.length ? Number((percentageErrors.reduce((sum, value) => sum + value, 0) / percentageErrors.length).toFixed(2)) : null,
    methodology: 'Rolling-origin backtest: use the prior 30 days of non-recurring net cash flow to predict the next 7 days; compare against actual posted/reconciled non-recurring net cash flow. Recurring-rule history is excluded because prior rule versions are not stored.',
  };
}
