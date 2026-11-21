import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from '../goals/goals.service';

const mockPrisma = {
  insight: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  budget: { findMany: jest.fn() },
  savingsGoal: { findMany: jest.fn(), findUnique: jest.fn() },
  debtPayoffPlan: { findMany: jest.fn() },
  account: { findUnique: jest.fn(), findMany: jest.fn() },
  transaction: { findMany: jest.fn() },
  apiToken: { findMany: jest.fn() },
  netWorthSnapshot: { findFirst: jest.fn() },
  category: { findUnique: jest.fn() },
  holding: { findMany: jest.fn() },
  container: { findMany: jest.fn() },
};

const mockGoalsService = { findAll: jest.fn() };

describe('InsightsService — Wave 5.5 Rules', () => {
  let service: InsightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GoalsService, useValue: mockGoalsService },
      ],
    }).compile();
    service = module.get<InsightsService>(InsightsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Safe defaults — nothing fires
    mockPrisma.insight.findMany.mockResolvedValue([]);
    mockPrisma.insight.findFirst.mockResolvedValue(null);
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.savingsGoal.findMany.mockResolvedValue([]);
    mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([]);
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.apiToken.findMany.mockResolvedValue([]);
    mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue(null);
    mockPrisma.category.findUnique.mockResolvedValue(null);
    mockPrisma.holding.findMany.mockResolvedValue([]);
    mockPrisma.container.findMany.mockResolvedValue([]);
    mockGoalsService.findAll.mockResolvedValue([]);
  });

  // Helper to find a specific insight.create call
  function findCreateCall(type: string) {
    return mockPrisma.insight.create.mock.calls.find(
      (call) => (call[0] as any)?.data?.type === type,
    );
  }

  // ==========================================================================
  // 1. TOKEN_EXPIRING
  // ==========================================================================
  describe('checkTokenExpiring', () => {
    it('creates an alert for a token expiring within 7 days', async () => {
      mockPrisma.apiToken.findMany.mockResolvedValue([
        {
          id: 'token-1',
          label: 'Farm Integration',
          containerId: 'biz-1',
          container: { id: 'biz-1', name: 'Sugarcane Farm' },
          expiresAt: new Date(Date.now() + 3 * 86_400_000),
        },
      ]);

      await service.generateForUser('user-1');

      const call = findCreateCall('TOKEN_EXPIRING');
      expect(call).toBeDefined();
      expect((call![0] as any).data.relatedEntityId).toBe('token-1');
      expect((call![0] as any).data.metadata.daysLeft).toBe(3);
    });

    it('skips tokens that already have a TOKEN_EXPIRING insight', async () => {
      mockPrisma.apiToken.findMany.mockResolvedValue([
        {
          id: 'token-1',
          label: 'Existing',
          containerId: 'biz-1',
          container: { id: 'biz-1', name: 'Biz' },
          expiresAt: new Date(Date.now() + 2 * 86_400_000),
        },
      ]);
      mockPrisma.insight.findFirst.mockImplementation(({ where }) =>
        Promise.resolve(where?.type === 'TOKEN_EXPIRING' ? { id: 'existing' } : null),
      );

      await service.generateForUser('user-1');

      expect(findCreateCall('TOKEN_EXPIRING')).toBeUndefined();
    });
  });

  // ==========================================================================
  // 2. NET_WORTH_MILESTONE
  // ==========================================================================
  describe('checkNetWorthMilestone', () => {
    it('creates an alert when crossing 250k for the first time', async () => {
      mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue({
        id: 'snap-1',
        totalNetWorth: '350000',
        currency: 'KES',
      });

      await service.generateForUser('user-1');

      const call = findCreateCall('NET_WORTH_MILESTONE');
      expect(call).toBeDefined();
      expect((call![0] as any).data.metadata.milestone).toBe(250000);
    });

    it('does not duplicate a previously alerted milestone', async () => {
      mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue({
        id: 'snap-1',
        totalNetWorth: '350000',
        currency: 'KES',
      });
      mockPrisma.insight.findMany.mockImplementation(({ where }) =>
        Promise.resolve(
          where?.type === 'NET_WORTH_MILESTONE' ? [{ metadata: { milestone: 250000 } }] : [],
        ),
      );

      await service.generateForUser('user-1');

      expect(findCreateCall('NET_WORTH_MILESTONE')).toBeUndefined();
    });

    it('does not fire below the first milestone', async () => {
      mockPrisma.netWorthSnapshot.findFirst.mockResolvedValue({
        id: 'snap-1',
        totalNetWorth: '50000',
        currency: 'KES',
      });

      await service.generateForUser('user-1');

      expect(findCreateCall('NET_WORTH_MILESTONE')).toBeUndefined();
    });
  });

  // ==========================================================================
  // 3. UNUSUAL_SPENDING
  // ==========================================================================
  describe('checkUnusualSpending', () => {
    it('creates an alert when current month spend exceeds 150% of 3-month average', async () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5);
      mockPrisma.transaction.findMany.mockResolvedValue([
        // Current month: 5000 on Groceries
        { categoryId: 'cat-1', amount: '5000', date: thisMonth },
        // Past 3 months: 3000 total → avg 1000/mo
        {
          categoryId: 'cat-1',
          amount: '3000',
          date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        },
      ]);
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Groceries' });

      await service.generateForUser('user-1');

      const call = findCreateCall('UNUSUAL_SPENDING');
      expect(call).toBeDefined();
      expect((call![0] as any).data.metadata.categoryId).toBe('cat-1');
    });

    it('ignores categories with low monthly averages (noise)', async () => {
      const now = new Date();
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          categoryId: 'cat-1',
          amount: '200',
          date: new Date(now.getFullYear(), now.getMonth(), 5),
        },
      ]);

      await service.generateForUser('user-1');

      expect(findCreateCall('UNUSUAL_SPENDING')).toBeUndefined();
    });
  });

  // ==========================================================================
  // 4. OPTIMIZATION_OPPORTUNITY
  // ==========================================================================
  describe('checkOptimizationOpportunity', () => {
    it('fires when savings >= 50k and high-interest debt exists', async () => {
      mockPrisma.account.findMany.mockResolvedValue([{ id: 'acc-1', currentBalance: '100000' }]);
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([
        {
          id: 'plan-1',
          interestRate: '24',
          account: { currentBalance: '50000', currency: 'KES' },
        },
      ]);

      await service.generateForUser('user-1');

      const call = findCreateCall('OPTIMIZATION_OPPORTUNITY');
      expect(call).toBeDefined();
      expect((call![0] as any).data.metadata.maxRate).toBe(24);
    });

    it('skips when savings are below 50k', async () => {
      mockPrisma.account.findMany.mockResolvedValue([{ id: 'acc-1', currentBalance: '10000' }]);
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([
        { id: 'plan-1', interestRate: '24', account: { currentBalance: '50000', currency: 'KES' } },
      ]);

      await service.generateForUser('user-1');

      expect(findCreateCall('OPTIMIZATION_OPPORTUNITY')).toBeUndefined();
    });

    it('skips when no high-interest debt exists', async () => {
      mockPrisma.account.findMany.mockResolvedValue([{ id: 'acc-1', currentBalance: '100000' }]);
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([]);

      await service.generateForUser('user-1');

      expect(findCreateCall('OPTIMIZATION_OPPORTUNITY')).toBeUndefined();
    });
  });

  // ==========================================================================
  // 5. REBALANCE_SUGGESTED
  // ==========================================================================
  describe('checkRebalanceSuggested', () => {
    it('fires when a single asset class exceeds 60% of the portfolio', async () => {
      mockPrisma.holding.findMany.mockResolvedValue([
        { id: 'h-1', assetClass: 'STOCK', currentValueTotal: '80000' },
        { id: 'h-2', assetClass: 'CRYPTO', currentValueTotal: '20000' },
      ]);

      await service.generateForUser('user-1');

      const call = findCreateCall('REBALANCE_SUGGESTED');
      expect(call).toBeDefined();
      expect((call![0] as any).data.metadata.assetClass).toBe('STOCK');
    });

    it('skips a balanced portfolio', async () => {
      mockPrisma.holding.findMany.mockResolvedValue([
        { id: 'h-1', assetClass: 'STOCK', currentValueTotal: '50000' },
        { id: 'h-2', assetClass: 'CRYPTO', currentValueTotal: '50000' },
      ]);

      await service.generateForUser('user-1');

      expect(findCreateCall('REBALANCE_SUGGESTED')).toBeUndefined();
    });
  });

  // ==========================================================================
  // 6. PROFIT_DECLINE
  // ==========================================================================
  describe('checkProfitDecline', () => {
    it('fires when income drops more than 25% MoM', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Sugarcane Farm', currency: 'KES' },
      ]);

      // checkProfitDecline issues two INCOME queries per business:
      //   1) last month range  → 5000
      //   2) prev month range  → 10000
      // Other checks (unusual spending, runway) also call transaction.findMany,
      // but they either use EXPENSE type or a 90-day window — return [] for them.
      const now = new Date();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();

      mockPrisma.transaction.findMany.mockImplementation(({ where }: any) => {
        if (where?.type !== 'INCOME') return Promise.resolve([]);
        const gte: number | undefined = where?.date?.gte?.getTime?.();
        if (gte === lastMonthStart) return Promise.resolve([{ amount: '5000' }]);
        if (gte === prevMonthStart) return Promise.resolve([{ amount: '10000' }]);
        return Promise.resolve([]);
      });

      await service.generateForUser('user-1');

      const call = findCreateCall('PROFIT_DECLINE');
      expect(call).toBeDefined();
      expect((call![0] as any).data.metadata.declinePct).toBe(50);
    });

    it('does not fire on mild decline', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Farm', currency: 'KES' },
      ]);

      const now = new Date();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();

      mockPrisma.transaction.findMany.mockImplementation(({ where }: any) => {
        if (where?.type !== 'INCOME') return Promise.resolve([]);
        const gte: number | undefined = where?.date?.gte?.getTime?.();
        if (gte === lastMonthStart) return Promise.resolve([{ amount: '9000' }]);
        if (gte === prevMonthStart) return Promise.resolve([{ amount: '10000' }]);
        return Promise.resolve([]);
      });

      await service.generateForUser('user-1');

      expect(findCreateCall('PROFIT_DECLINE')).toBeUndefined();
    });
  });

  // ==========================================================================
  // 7. RUNWAY_LOW
  // ==========================================================================
  describe('checkRunwayLow', () => {
    it('fires when runway is below 3 months', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Struggling Shop', currency: 'KES' },
      ]);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 'acc-1', currentBalance: '10000' }]);
      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: '5000' },
        { amount: '5000' },
        { amount: '5000' },
      ]); // 15k over 3 months → 5k/mo burn → 2 months runway

      await service.generateForUser('user-1');

      const call = findCreateCall('RUNWAY_LOW');
      expect(call).toBeDefined();
      expect((call![0] as any).data.metadata.runwayMonths).toBe(2);
    });

    it('skips businesses with healthy runway', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Healthy Biz', currency: 'KES' },
      ]);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 'acc-1', currentBalance: '100000' }]);
      mockPrisma.transaction.findMany.mockResolvedValue([{ amount: '3000' }]);

      await service.generateForUser('user-1');

      expect(findCreateCall('RUNWAY_LOW')).toBeUndefined();
    });
  });
});
