import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';

const mockPrisma = {
  insight: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  budget: { findMany: jest.fn() },
  savingsGoal: { findMany: jest.fn(), findUnique: jest.fn() },
  debtPayoffPlan: { findMany: jest.fn() },
  account: { findUnique: jest.fn(), findMany: jest.fn() },
  transaction: { findMany: jest.fn() },
  // NEW for Wave 5.5:
  apiToken: { findMany: jest.fn() },
  netWorthSnapshot: { findFirst: jest.fn() },
  category: { findUnique: jest.fn() },
  holding: { findMany: jest.fn() },
  container: { findMany: jest.fn() },
};

describe('InsightsService (Unit)', () => {
  let service: InsightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GoalsService, useValue: { findAll: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get<InsightsService>(InsightsService);

    // Default: safe mock resolutions so generateForUser() doesn't crash
    mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([]);
    mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.insight.findFirst.mockResolvedValue(null);
    mockPrisma.insight.findMany.mockResolvedValue([]);
    mockPrisma.apiToken.findMany.mockResolvedValue([]);
    mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue(null);
    mockPrisma.category.findUnique.mockResolvedValue(null);
    mockPrisma.holding.findMany.mockResolvedValue([]);
    mockPrisma.container.findMany.mockResolvedValue([]);
    mockPrisma.account.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateForUser', () => {
    it('should not create a duplicate insight if one is already active', async () => {
      // Mock a budget that is overspent
      mockPrisma.budget.findMany.mockResolvedValue([
        { id: 'b1', amount: 1000, containerId: 'c1', categoryId: 'cat1', currency: 'KES' },
      ]);
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);

      // Mock transactions totaling 1500 (overspent)
      mockPrisma.transaction.findMany.mockResolvedValue([{ amount: 1500 }]);

      // Mock that an insight already exists
      mockPrisma.insight.findFirst.mockResolvedValue({ id: 'existing-insight' });

      const result = await service.generateForUser('u1');

      // Because the insight exists, it should NOT create a new one
      expect(result.created).toBe(0);
      expect(mockPrisma.insight.create).not.toHaveBeenCalled();
    });

    it('should create an insight for a budget that is near limit (80-99%)', async () => {
      // Mock a budget of 1000
      mockPrisma.budget.findMany.mockResolvedValue([
        { id: 'b1', amount: 1000, containerId: 'c1', categoryId: 'cat1', currency: 'KES' },
      ]);
      mockPrisma.savingsGoal.findMany.mockResolvedValue([]);

      // Mock transactions totaling 850 (85%)
      mockPrisma.transaction.findMany.mockResolvedValue([{ amount: 850 }]);

      mockPrisma.insight.findFirst.mockResolvedValue(null);

      await service.generateForUser('u1');

      expect(mockPrisma.insight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'BUDGET_NEAR_LIMIT',
          }),
        }),
      );
    });

    it('should create an insight for a goal that is achieved', async () => {
      // No budgets
      mockPrisma.budget.findMany.mockResolvedValue([]);

      // One goal with a target of 1000
      mockPrisma.savingsGoal.findMany.mockResolvedValue([
        {
          id: 'g1',
          targetAmount: 1000,
          linkedAccountId: 'acc1',
          containerId: 'c1',
          currency: 'KES',
        },
      ]);

      // Mock the account having 1000
      mockPrisma.account.findUnique.mockResolvedValue({ currentBalance: 1000 });

      mockPrisma.insight.findFirst.mockResolvedValue(null);

      await service.generateForUser('u1');

      expect(mockPrisma.insight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'GOAL_ACHIEVED',
          }),
        }),
      );
    });
  });
});
