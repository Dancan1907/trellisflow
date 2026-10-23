import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  netWorthSnapshot: { findFirst: jest.fn(), findMany: jest.fn() },
  transaction: { findMany: jest.fn() },
  container: { findMany: jest.fn() },
  insight: { findMany: jest.fn() },
};

describe('DashboardService (Unit)', () => {
  let service: DashboardService;

  beforeEach(async () => {
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
        { type: 'INCOME', amount: 5000 },
        { type: 'EXPENSE', amount: 2000 },
      ]);

      const result = await service.getSummary('u1');

      expect(result.netWorth.total).toBe(50000);
      expect(result.cashFlow.income).toBe(5000);
      expect(result.cashFlow.expenses).toBe(2000);
      expect(result.cashFlow.net).toBe(3000);
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
    it('should compute net worth for asset and liability accounts', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Personal',
          type: 'PERSONAL',
          currency: 'KES',
          accounts: [
            { category: 'ASSET', currentBalance: 5000 },
            { category: 'LIABILITY', currentBalance: 1000 },
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
