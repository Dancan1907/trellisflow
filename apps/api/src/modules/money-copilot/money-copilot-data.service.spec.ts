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
