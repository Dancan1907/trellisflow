import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  savingsGoal: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  account: { findUnique: jest.fn(), findFirst: jest.fn() },
  container: { findFirst: jest.fn() },
  transaction: { findMany: jest.fn().mockResolvedValue([]) },
  goalContribution: { findMany: jest.fn().mockResolvedValue([]) },
};

describe('GoalsService (Unit)', () => {
  let service: GoalsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Re-apply default resolved values after clearAllMocks wipes them
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.goalContribution.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoalsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<GoalsService>(GoalsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('calculateProgress (via findOne)', () => {
    it('should calculate progress from a linked account balance', async () => {
      mockPrisma.savingsGoal.findFirst.mockResolvedValue({
        id: 'g1',
        userId: 'u1',
        containerId: 'c1',
        name: 'Emergency Fund',
        targetAmount: 10000,
        currency: 'KES',
        targetDate: null,
        linkedAccountId: 'acc1',
        manualSavedAmount: null,
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01'),
      });
      // Mock the linked account having 4,000
      mockPrisma.account.findUnique.mockResolvedValue({ currentBalance: 4000 });

      const result = await service.findOne('u1', 'g1');

      expect(result.currentAmount).toBe(4000);
      expect(result.remaining).toBe(6000);
      expect(result.percentage).toBe(40);
    });

    it('should fallback to manual amount if not linked to an account', async () => {
      mockPrisma.savingsGoal.findFirst.mockResolvedValue({
        id: 'g1',
        userId: 'u1',
        containerId: 'c1',
        name: 'Emergency Fund',
        targetAmount: 10000,
        currency: 'KES',
        targetDate: null,
        linkedAccountId: null,
        manualSavedAmount: 2000,
        status: 'ACTIVE',
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.findOne('u1', 'g1');

      expect(result.currentAmount).toBe(2000);
      expect(result.percentage).toBe(20);
    });
  });
});
