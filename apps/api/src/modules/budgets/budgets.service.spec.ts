import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

const mockPrisma = {
  budget: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  container: { findFirst: jest.fn() },
  category: { findFirst: jest.fn() },
  transaction: { findMany: jest.fn() },
};

describe('BudgetsService (Unit)', () => {
  let service: BudgetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateProgress logic (via findOne)', () => {
    it('should calculate spent, remaining, and percentage correctly', async () => {
      // Mock a budget of 10,000
      mockPrisma.budget.findFirst.mockResolvedValue({
        id: 'b1',
        userId: 'u1',
        containerId: 'c1',
        categoryId: 'cat1',
        amount: 10000,
        period: 'MONTHLY',
      });

      // Mock transactions totaling 2,500
      mockPrisma.transaction.findMany.mockResolvedValue([{ amount: 1500 }, { amount: 1000 }]);

      const result = await service.findOne('u1', 'b1');

      expect(result.amount).toBe(10000);
      expect(result.spent).toBe(2500);
      expect(result.remaining).toBe(7500);
      expect(result.percentage).toBe(25);
    });

    it('should handle zero amount gracefully (no division by zero)', async () => {
      mockPrisma.budget.findFirst.mockResolvedValue({
        id: 'b1',
        userId: 'u1',
        containerId: 'c1',
        categoryId: 'cat1',
        amount: 0,
        period: 'MONTHLY',
      });
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.findOne('u1', 'b1');
      expect(result.percentage).toBe(0);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if budget already exists', async () => {
      mockPrisma.container.findFirst.mockResolvedValue({ id: 'c1' });
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat1' });
      mockPrisma.budget.findFirst.mockResolvedValue({ id: 'existing-budget' });

      await expect(
        service.create('u1', {
          containerId: 'c1',
          categoryId: 'cat1',
          amount: 5000,
          currency: 'KES',
          period: 'MONTHLY',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
