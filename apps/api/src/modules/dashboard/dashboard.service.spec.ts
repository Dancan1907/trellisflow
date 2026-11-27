import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  netWorthSnapshot: { findFirst: jest.fn(), findMany: jest.fn() },
  transaction: { findMany: jest.fn() },
  container: { findMany: jest.fn() },
  holding: { findMany: jest.fn() },
  insight: { findMany: jest.fn() },
};

describe('DashboardService (Unit)', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ reportingCurrency: 'KES' });
    mockPrisma.holding.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getSummary', () => {
    it('should aggregate net worth and cash flow', async () => {
      mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue({
        totalNetWorth: 50000,
        personalNetWorth: 20000,
        investmentsNetWorth: 20000,
        businessesNetWorth: 10000,
        currency: 'KES',
      });
      mockPrisma.transaction.findMany.mockResolvedValue([
        { type: 'INCOME', amount: 5000, currency: 'KES' },
        { type: 'EXPENSE', amount: 2000, currency: 'KES' },
      ]);

      const result = await service.getSummary('u1');

      expect(result.netWorth.total).toBe(50000);
      expect(result.cashFlow.income).toBe(5000);
      expect(result.cashFlow.expenses).toBe(2000);
      expect(result.cashFlow.net).toBe(3000);
    });

    it('keeps dashboard cash flow grouped by currency and excludes pending rows', async () => {
      mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue({
        totalNetWorth: 1000,
        personalNetWorth: 1000,
        investmentsNetWorth: 0,
        businessesNetWorth: 0,
        currency: 'KES',
        breakdown: { byCurrency: [{ currency: 'KES', totalNetWorth: 1000 }] },
      });
      mockPrisma.transaction.findMany.mockResolvedValue([
        { type: 'INCOME', amount: 5000, currency: 'KES' },
        { type: 'EXPENSE', amount: 2000, currency: 'USD' },
      ]);

      const result = await service.getSummary('u1');

      expect(result.cashFlow.currency).toBe('KES');
      expect(result.cashFlow.income).toBe(5000);
      expect(result.cashFlow.expenses).toBe(0);
      expect(result.cashFlow.byCurrency).toEqual(expect.arrayContaining([
        expect.objectContaining({ currency: 'KES', income: 5000, expenses: 0 }),
        expect.objectContaining({ currency: 'USD', income: 0, expenses: 2000 }),
      ]));
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['POSTED', 'RECONCILED'] } }),
      }));
    });

    it('should handle no snapshot gracefully', async () => {
      mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue(null);
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getSummary('u1');

      expect(result.netWorth.total).toBe(0);
      expect(result.cashFlow.income).toBe(0);
    });
  });

  describe('getContainerCards', () => {
    it('keeps container account balances separated by currency', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Personal',
          type: 'PERSONAL',
          currency: 'KES',
          accounts: [
            { category: 'ASSET', currentBalance: 5000, currency: 'KES' },
            { category: 'ASSET', currentBalance: 300, currency: 'USD' },
          ],
          summaries: [],
          _count: { accounts: 2 },
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getContainerCards('u1');

      expect(result[0]!.netWorth).toBe(5000);
      expect(result[0]!.byCurrency).toEqual(expect.arrayContaining([
        expect.objectContaining({ currency: 'KES', netWorth: 5000 }),
        expect.objectContaining({ currency: 'USD', netWorth: 300 }),
      ]));
    });


    it('includes open investment holdings separately from investment account cash', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        {
          id: 'investment-1',
          name: 'Investments',
          type: 'INVESTMENT',
          currency: 'KES',
          accounts: [{ category: 'ASSET', currentBalance: 100, currency: 'KES' }],
          summaries: [],
          _count: { accounts: 1 },
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.holding.findMany.mockResolvedValue([
        { containerId: 'investment-1', currency: 'KES', currentValueTotal: 200 },
      ]);

      const result = await service.getContainerCards('u1');

      expect(result[0]!.netWorth).toBe(300);
      expect(result[0]!.byCurrency).toEqual([
        { currency: 'KES', netWorth: 300 },
      ]);
    });

    it('should compute net worth for asset and liability accounts', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Personal',
          type: 'PERSONAL',
          currency: 'KES',
          accounts: [
            { category: 'ASSET', currentBalance: 5000, currency: 'KES' },
            { category: 'LIABILITY', currentBalance: 1000, currency: 'KES' },
          ],
          summaries: [],
          _count: { accounts: 2 },
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getContainerCards('u1');

      expect(result.length).toBe(1);
      expect(result[0]!.netWorth).toBe(4000);
      expect(result[0]!.accountCount).toBe(2);
    });
  });
});
