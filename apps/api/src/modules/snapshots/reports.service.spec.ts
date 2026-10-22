import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  netWorthSnapshot: { findMany: jest.fn(), findFirst: jest.fn() },
  transaction: { findMany: jest.fn() },
};

describe('ReportsService (Unit)', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getCashFlow', () => {
    it('should correctly sum income and expenses', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        { type: 'INCOME', amount: 5000 },
        { type: 'INCOME', amount: 2000 },
        { type: 'EXPENSE', amount: 1500 },
        { type: 'TRANSFER', amount: 1000 }, // Should be ignored
      ]);

      const result = await service.getCashFlow('u1', new Date(), new Date());

      expect(result.income).toBe(7000);
      expect(result.expenses).toBe(1500);
      expect(result.net).toBe(5500);
    });
  });

  describe('getAllocation', () => {
    it('should return the latest snapshot breakdown', async () => {
      mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue({
        totalNetWorth: 50000,
        personalNetWorth: 20000,
        investmentsNetWorth: 20000,
        businessesNetWorth: 10000,
      });

      const result = await service.getAllocation('u1');

      expect(result.total).toBe(50000);
      expect(result.breakdown.personal).toBe(20000);
      expect(result.breakdown.investments).toBe(20000);
      expect(result.breakdown.businesses).toBe(10000);
    });

    it('should return a message if no snapshot exists', async () => {
      mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue(null);
      const result = await service.getAllocation('u1');
      expect(result.message).toBe('No snapshots found yet.');
    });
  });
});
