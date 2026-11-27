import { MoneyCopilotDataService } from './money-copilot-data.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';

describe('MoneyCopilotDataService', () => {
  let service: MoneyCopilotDataService;
  const prisma = {
    user: { findUnique: jest.fn() },
    netWorthSnapshot: { findFirst: jest.fn() },
    account: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
    holding: { findMany: jest.fn() },
    container: { findMany: jest.fn() },
  };
  const businesses = {
    getNetWorth: jest.fn(),
    getPnl: jest.fn(),
    getRunway: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ timezone: 'Africa/Nairobi', reportingCurrency: 'KES' });
    prisma.netWorthSnapshot.findFirst.mockResolvedValue(null);
    prisma.account.findMany.mockResolvedValue([]);
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.holding.findMany.mockResolvedValue([]);
    prisma.container.findMany.mockResolvedValue([]);
    service = new MoneyCopilotDataService(
      prisma as unknown as PrismaService,
      businesses as unknown as BusinessesService,
    );
  });

  it('builds a minimal overview and scopes every query to the authenticated user', async () => {
    const result = await service.buildContext('user-1', 'Give me my financial summary');

    expect(result.reportingCurrency).toBe('KES');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' }, select: { timezone: true, reportingCurrency: true },
    });
    expect(prisma.account.findMany.mock.calls[0][0].where).toMatchObject({ userId: 'user-1' });
    expect(prisma.transaction.findMany.mock.calls[0][0].where).toMatchObject({ userId: 'user-1' });
    expect(JSON.stringify(result)).not.toContain('notes');
  });

  it('only requests investment records when the question concerns investments', async () => {
    await service.buildContext('user-1', 'How is my investment portfolio doing?');

    expect(prisma.holding.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', status: 'OPEN', deletedAt: null },
    }));
  });

  it('does not request investment records for an unrelated question', async () => {
    await service.buildContext('user-1', 'Summarize my monthly cash flow');

    expect(prisma.holding.findMany).not.toHaveBeenCalled();
  });

  it('keeps spending calculations grouped by currency and excludes transfers', async () => {
    const date = new Date();
    prisma.transaction.findMany.mockImplementation(async (args: any) => {
      if (args.where?.date && args.select?.category) return [
        { type: 'EXPENSE', amount: 120, currency: 'KES', date, category: { name: 'Food' } },
        { type: 'EXPENSE', amount: 50, currency: 'USD', date, category: { name: 'Food' } },
        { type: 'TRANSFER', amount: 300, currency: 'KES', date, category: null },
      ];
      return [];
    });

    const result = await service.buildContext('user-1', 'Show my spending by category');
    const spending = result.spendingAnalysis as { totals: Array<{ currency: string; totalExpenses: number }> };

    expect(spending.totals).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: 'KES', totalExpenses: 120 }),
      expect.objectContaining({ currency: 'USD', totalExpenses: 50 }),
    ]));
  });

  it('calculates portfolio return and holding concentration without claiming volatility risk', async () => {
    prisma.holding.findMany.mockResolvedValue([
      { name: 'Holding A', symbol: 'AAA', assetClass: 'EQUITY', currency: 'KES', costBasisTotal: 100, currentValueTotal: 120 },
      { name: 'Holding B', symbol: 'BBB', assetClass: 'EQUITY', currency: 'KES', costBasisTotal: 100, currentValueTotal: 30 },
    ]);

    const result = await service.buildContext('user-1', 'Analyze my investment portfolio risk');
    const investments = result.investments as any;

    expect(investments.byCurrency[0]).toMatchObject({
      currency: 'KES',
      costBasis: 200,
      currentValue: 150,
      unrealizedGain: -50,
      unrealizedReturnPercent: -25,
    });
    expect(investments.byCurrency[0].concentration.largestHoldingPercent).toBe(80);
    expect(investments.riskLimitations).toContain(
      'No historical market-price series is queried, so volatility, beta, maximum drawdown and Sharpe ratio are not calculated.',
    );
  });

  it('provides a deterministic spending-reduction illustration from recorded expenses', async () => {
    const date = new Date();
    prisma.transaction.findMany.mockImplementation(async (args: any) => {
      if (args.select?.account) return [];
      if (args.select?.category) {
        return [{ type: 'EXPENSE', amount: 120, currency: 'KES', date, category: { name: 'Food' } }];
      }
      return [];
    });

    const result = await service.buildContext('user-1', 'What if I reduce my spending by 10%?');
    const simulation = result.whatIfSimulation as any;

    expect(simulation.requestedChangePercent).toBe(10);
    expect(simulation.result).toEqual([
      expect.objectContaining({
        currency: 'KES',
        baselineExpenses: 120,
        estimatedMonthlySavings: 12,
        projectedExpensesAfterChange: 108,
      }),
    ]);
  });

  it('uses the saved net-worth snapshot as the consolidated total without adding overlapping records', async () => {
    prisma.netWorthSnapshot.findFirst.mockResolvedValue({
      date: new Date('2026-11-20T00:00:00.000Z'),
      totalNetWorth: 1000,
      personalNetWorth: 600,
      investmentsNetWorth: 250,
      businessesNetWorth: 150,
      currency: 'KES',
    });

    const result = await service.buildContext('user-1', 'Show my overall consolidated wealth');
    expect(result.consolidatedWealth).toMatchObject({
      currency: 'KES',
      totalNetWorth: 1000,
      components: { personal: 600, investments: 250, businesses: 150 },
    });
    expect((result.consolidatedWealth as any).aggregationRule).toContain('Do not add account balances');
  });

  it('calculates internal business profit margin from the trusted P&L service', async () => {
    prisma.container.findMany.mockResolvedValue([
      { id: 'business-1', name: 'My Business', type: 'INTERNAL_BUSINESS', currency: 'KES' },
    ]);
    businesses.getNetWorth.mockResolvedValue({ netWorth: 500 });
    businesses.getPnl.mockResolvedValue({
      from: '2026-11-01', to: '2026-11-27',
      totalIncome: 400, totalExpenses: 300, netProfit: 100, byCategory: [],
    });
    businesses.getRunway.mockResolvedValue({
      currency: 'KES', cashBalance: 200, monthlyBurn: 100, runwayMonths: 2,
    });

    const result = await service.buildContext('user-1', 'How profitable is my business and what is its cash runway?');
    const performance = result.businessPerformance as any[];

    expect(performance[0].profitAndLoss).toMatchObject({
      income: 400, expenses: 300, netProfit: 100, netProfitMarginPercent: 25,
    });
    expect(performance[0].cashRunwayEstimate.runwayMonths).toBe(2);
  });

  it('accepts the 100 percent scenario boundary', async () => {
    const date = new Date();
    prisma.transaction.findMany.mockImplementation(async (args: any) => {
      if (args.select?.account) return [];
      if (args.select?.category) {
        return [{ type: 'EXPENSE', amount: 120, currency: 'KES', date, category: { name: 'Food' } }];
      }
      return [];
    });

    const result = await service.buildContext('user-1', 'What if I reduce my spending by 100%?');
    const simulation = result.whatIfSimulation as any;

    expect(simulation.requestedChangePercent).toBe(100);
    expect(simulation.result[0]).toMatchObject({
      estimatedMonthlySavings: 120,
      projectedExpensesAfterChange: 0,
    });
  });

  it('rejects negative scenario percentages instead of treating them as positive changes', async () => {
    const date = new Date();
    prisma.transaction.findMany.mockImplementation(async (args: any) => {
      if (args.select?.account) return [];
      if (args.select?.category) {
        return [{ type: 'EXPENSE', amount: 120, currency: 'KES', date, category: { name: 'Food' } }];
      }
      return [];
    });

    const result = await service.buildContext('user-1', 'What if I reduce my spending by -10%?');
    const simulation = result.whatIfSimulation as any;

    expect(simulation.requestedChangePercent).toBe(-10);
    expect(simulation.result).toBeNull();
  });

  it('simulates a business revenue increase from the recorded P&L without writing changes', async () => {
    prisma.container.findMany.mockResolvedValue([
      { id: 'business-1', name: 'My Business', type: 'INTERNAL_BUSINESS', currency: 'KES' },
    ]);
    businesses.getNetWorth.mockResolvedValue({ netWorth: 500 });
    businesses.getPnl.mockResolvedValue({
      from: '2026-11-01', to: '2026-11-27',
      totalIncome: 400, totalExpenses: 300, netProfit: 100, byCategory: [],
    });
    businesses.getRunway.mockResolvedValue({ currency: 'KES', cashBalance: 200, monthlyBurn: 100, runwayMonths: 2 });

    const result = await service.buildContext('user-1', 'What if my business revenue increases by 10%?');
    const simulation = result.whatIfSimulation as any;

    expect(simulation.scenarioType).toBe('BUSINESS_REVENUE_CHANGE');
    expect(simulation.result[0]).toMatchObject({
      currency: 'KES',
      baselineRevenue: 400,
      baselineExpenses: 300,
      projectedRevenue: 440,
      projectedExpenses: 300,
      projectedNetProfit: 140,
      projectedNetProfitMarginPercent: 31.82,
    });
    expect(businesses.getPnl).toHaveBeenCalledTimes(1);
  });

  it('simulates a portfolio value decline separately for each currency', async () => {
    prisma.holding.findMany.mockResolvedValue([
      { name: 'Holding KES', symbol: 'AAA', assetClass: 'EQUITY', currency: 'KES', costBasisTotal: 100, currentValueTotal: 200 },
      { name: 'Holding USD', symbol: 'BBB', assetClass: 'EQUITY', currency: 'USD', costBasisTotal: 50, currentValueTotal: 100 },
    ]);

    const result = await service.buildContext('user-1', 'What if my portfolio drops by 10%?');
    const simulation = result.whatIfSimulation as any;

    expect(simulation.scenarioType).toBe('PORTFOLIO_VALUE_SENSITIVITY');
    expect(simulation.result).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: 'KES', currentValue: 200, hypotheticalValue: 180, hypotheticalGainOrLoss: -20 }),
      expect.objectContaining({ currency: 'USD', currentValue: 100, hypotheticalValue: 90, hypotheticalGainOrLoss: -10 }),
    ]));
  });

  it('does not invent a simulation for an unsupported scenario', async () => {
    const result = await service.buildContext('user-1', 'What if I hire three more employees?');
    const simulation = result.whatIfSimulation as any;

    expect(simulation.scenarioType).toBe('UNSUPPORTED_SCENARIO');
    expect(simulation.result).toBeNull();
    expect(simulation.limitations.join(' ')).toContain('Supported scenarios');
  });

  it('uses description-only transaction search and never selects private notes', async () => {
    await service.buildContext('user-1', 'Find my fuel transaction');

    const lookupCall = prisma.transaction.findMany.mock.calls.find((call) =>
      call[0].where?.OR,
    );
    expect(lookupCall).toBeDefined();
    expect(lookupCall![0].where).toMatchObject({ userId: 'user-1', deletedAt: null });
    expect(lookupCall![0].select).not.toHaveProperty('notes');
  });

  it('does not return unrelated recent transactions when a description search has no matches', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    const result = await service.buildContext('user-1', 'Find my fuel transaction');
    expect(result.transactionLookup).toMatchObject({
      searchTerms: ['fuel'],
      matchedCount: 0,
      transactions: [],
    });
    const lookupCalls = prisma.transaction.findMany.mock.calls.filter((call) => call[0].where?.OR);
    expect(lookupCalls).toHaveLength(1);
  });
});
