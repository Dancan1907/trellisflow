import { backtestVariableCashFlow, computeCashFlowForecast } from './cash-flow-forecasting.engine';

const account = { id: 'account-1', name: 'Main wallet', currency: 'KES', currentBalance: '1000.0000' };

describe('computeCashFlowForecast', () => {
  const base = {
    asOf: new Date('2026-01-01T00:00:00.000Z'),
    horizonDays: 35,
    historyDays: 30,
    accounts: [account],
    rules: [],
    transactions: [],
  };

  it('projects recurring income and expenses without creating transactions', () => {
    const result = computeCashFlowForecast({
      ...base,
      rules: [
        { id: 'salary', accountId: account.id, transferToAccountId: null, type: 'INCOME', amount: '100.00', currency: 'KES', description: 'Salary', frequency: 'MONTHLY', interval: 1, nextOccurrence: '2026-01-05', endDate: null, status: 'ACTIVE' },
        { id: 'rent', accountId: account.id, transferToAccountId: null, type: 'EXPENSE', amount: '40.00', currency: 'KES', description: 'Rent', frequency: 'MONTHLY', interval: 1, nextOccurrence: '2026-01-10', endDate: null, status: 'ACTIVE' },
      ],
    });
    expect(result.accounts[0]!.points.find((point) => point.date === '2026-01-05')!.recurringNet).toBe(100);
    expect(result.accounts[0]!.points.find((point) => point.date === '2026-01-10')!.recurringNet).toBe(-40);
    expect(result.accounts[0]!.closingBalance).toBe(1060);
  });

  it('uses signed transfer rows and does not count transfers as income or expense', () => {
    const result = computeCashFlowForecast({
      ...base,
      accounts: [
        account,
        { id: 'account-2', name: 'Savings', currency: 'KES', currentBalance: '0' },
      ],
      rules: [
        { id: 'transfer', accountId: account.id, transferToAccountId: 'account-2', type: 'TRANSFER', amount: '25', currency: 'KES', description: 'Move savings', frequency: 'WEEKLY', interval: 1, nextOccurrence: '2026-01-02', endDate: null, status: 'ACTIVE' },
      ],
    });
    expect(result.accounts[0]!.points[0]!.recurringNet).toBe(-25);
    expect(result.accounts[1]!.points[0]!.recurringNet).toBe(25);
    expect(result.accounts[0]!.closingBalance + result.accounts[1]!.closingBalance).toBe(1000);
  });

  it('excludes recurring transactions from the historical baseline', () => {
    const result = computeCashFlowForecast({
      ...base,
      transactions: [
        { accountId: account.id, type: 'INCOME', amount: '300', date: '2025-12-20', recurringRuleId: null, status: 'POSTED' },
        { accountId: account.id, type: 'INCOME', amount: '900', date: '2025-12-21', recurringRuleId: 'salary', status: 'POSTED' },
      ],
    });
    expect(result.accounts[0]!.points[0]!.historicalBaselineNet).toBe(10);
  });

  it('includes future-dated known transactions and excludes pending history', () => {
    const result = computeCashFlowForecast({
      ...base,
      transactions: [
        { accountId: account.id, type: 'EXPENSE', amount: '50', date: '2026-01-03', recurringRuleId: null, status: 'POSTED' },
        { accountId: account.id, type: 'EXPENSE', amount: '100', date: '2025-12-20', recurringRuleId: null, status: 'PENDING' },
      ],
    });
    expect(result.accounts[0]!.points[1]!.knownScheduledNet).toBe(-50);
    expect(result.accounts[0]!.closingBalance).toBe(950);
  });

  it('clamps month-end recurrence dates and respects end dates', () => {
    const result = computeCashFlowForecast({
      ...base,
      rules: [
        { id: 'rent', accountId: account.id, transferToAccountId: null, type: 'EXPENSE', amount: '10', currency: 'KES', description: 'Rent', frequency: 'MONTHLY', interval: 1, nextOccurrence: '2026-01-31', endDate: '2026-02-28', status: 'ACTIVE' },
      ],
    });
    expect(result.accounts[0]!.points.find((point) => point.date === '2026-01-31')!.recurringNet).toBe(-10);
    expect(result.accounts[0]!.points.find((point) => point.date === '2026-02-28')!.recurringNet).toBe(-10);
    expect(result.accounts[0]!.closingBalance).toBe(980);
  });

  it('does not combine different currencies and warns about unsupported custom recurrence', () => {
    const result = computeCashFlowForecast({
      ...base,
      rules: [
        { id: 'custom', accountId: account.id, transferToAccountId: null, type: 'EXPENSE', amount: '10', currency: 'KES', description: 'Custom bill', frequency: 'CUSTOM', interval: 1, nextOccurrence: '2026-01-02', endDate: null, status: 'ACTIVE' },
      ],
    });
    expect(result.warnings.some((warning) => warning.includes('Custom'))).toBe(true);
    expect(result.accounts).toHaveLength(1);
  });

  it('applies scenario adjustments to historical variable flows', () => {
    const result = computeCashFlowForecast({
      ...base,
      incomeAdjustmentPercent: 10,
      transactions: [
        { accountId: account.id, type: 'INCOME', amount: '300', date: '2025-12-20', recurringRuleId: null, status: 'POSTED' },
      ],
    });
    expect(result.accounts[0]!.points[0]!.historicalBaselineNet).toBe(11);
  });
});

describe('backtestVariableCashFlow', () => {
  it('returns a rolling-origin error metric when enough history exists', () => {
    const transactions = Array.from({ length: 90 }, (_, index) => ({
      accountId: account.id,
      type: 'INCOME' as const,
      amount: '10',
      date: new Date(Date.UTC(2025, 9, 3 + index)).toISOString().slice(0, 10),
      recurringRuleId: null,
      status: 'POSTED',
    }));
    const result = backtestVariableCashFlow({
      transactions,
      accountIds: [account.id],
      asOf: new Date('2026-01-01T00:00:00.000Z'),
      historyDays: 90,
    });
    expect(result.sampleCount).toBeGreaterThan(0);
    expect(result.meanAbsoluteErrorPerDay).toBe(0);
    expect(result.meanAbsolutePercentageError).toBe(0);
  });
});
