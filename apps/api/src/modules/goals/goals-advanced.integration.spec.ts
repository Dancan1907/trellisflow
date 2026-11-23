import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from './goals.service';
import { InsightsService } from '../insights/insights.service';

describe('Goals Advanced (Integration)', () => {
  let prisma: PrismaService;
  let goals: GoalsService;
  let insights: InsightsService;

  let userId: string;
  let containerId: string;

  const makeGoal = (data: Record<string, unknown> = {}) =>
    prisma.savingsGoal.create({
      data: {
        id: randomUUID(),
        userId,
        containerId,
        name: 'Test Goal',
        targetAmount: 1000,
        currency: 'KES',
        status: 'ACTIVE',
        ...data,
      } as any,
    });

  const milestonesFor = async (goalId: string) =>
    (
      await prisma.insight.findMany({
        where: { userId, type: 'GOAL_MILESTONE', relatedEntityId: goalId },
        orderBy: { createdAt: 'asc' },
      })
    ).map((i) => (i.metadata as { milestone: number }).milestone);

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [PrismaService, GoalsService, InsightsService],
    }).compile();

    prisma = module.get(PrismaService);
    goals = module.get(GoalsService);
    insights = module.get(InsightsService);

    userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `goals-adv-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Goals Adv Test',
      },
    });

    containerId = randomUUID();
    await prisma.container.create({
      data: { id: containerId, userId, type: 'PERSONAL', name: 'Personal', currency: 'KES' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } }); // cascades to everything else
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.insight.deleteMany({ where: { userId } });
    await prisma.savingsGoal.deleteMany({ where: { userId } });
  });

  // ==========================================================================
  describe('manual contributions', () => {
    it('adds to the saved amount and records history', async () => {
      const goal = await makeGoal();
      await goals.addContribution(userId, goal.id, { amount: 500, date: '2026-10-01' });
      await goals.addContribution(userId, goal.id, { amount: 700, date: '2026-10-15' });

      const progress = await goals.findOne(userId, goal.id);
      expect(progress.currentAmount).toBe(1200);
      expect(progress.percentage).toBe(120);

      const { history } = await goals.getHistory(userId, goal.id);
      expect(history[history.length - 1]!.amount).toBe(1200);
      expect(history.find((p) => p.date === '2026-10-01')!.amount).toBe(500);
    });

    it('builds on an existing manualSavedAmount instead of resetting it', async () => {
      const goal = await makeGoal({ manualSavedAmount: 2000 });
      await goals.addContribution(userId, goal.id, { amount: 500 });
      const progress = await goals.findOne(userId, goal.id);
      expect(progress.currentAmount).toBe(2500);
    });

    it('supports withdrawals but rejects one larger than the saved amount', async () => {
      const goal = await makeGoal({ manualSavedAmount: 300 });
      await goals.addContribution(userId, goal.id, { amount: -100 });
      expect((await goals.findOne(userId, goal.id)).currentAmount).toBe(200);

      await expect(goals.addContribution(userId, goal.id, { amount: -500 })).rejects.toThrow(
        BadRequestException,
      );
      expect((await goals.findOne(userId, goal.id)).currentAmount).toBe(200);
    });

    it('rejects a zero amount', async () => {
      const goal = await makeGoal();
      await expect(goals.addContribution(userId, goal.id, { amount: 0 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects contributions on a goal linked to an account', async () => {
      const accountId = randomUUID();
      await prisma.account.create({
        data: {
          id: accountId,
          userId,
          containerId,
          name: 'Savings',
          category: 'ASSET',
          accountType: 'SAVINGS',
          currency: 'KES',
          currentBalance: 100,
        },
      });
      const goal = await makeGoal({ linkedAccountId: accountId });
      await expect(goals.addContribution(userId, goal.id, { amount: 50 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  describe('linked-account history', () => {
    it('rebuilds history backwards so it ends exactly at the account balance', async () => {
      const accountId = randomUUID();
      // Net of the three transactions below is +600, so the opening balance was 400
      await prisma.account.create({
        data: {
          id: accountId,
          userId,
          containerId,
          name: 'Linked',
          category: 'ASSET',
          accountType: 'SAVINGS',
          currency: 'KES',
          currentBalance: 1000,
        },
      });

      const tx = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER', amount: number, date: string) =>
        prisma.transaction.create({
          data: {
            id: randomUUID(),
            userId,
            containerId,
            accountId,
            type,
            amount,
            currency: 'KES',
            date: new Date(date),
            description: `${type} test`,
          },
        });
      await tx('INCOME', 400, '2026-01-10'); // 400 -> 800
      await tx('TRANSFER', 300, '2026-02-10'); // signed, already positive -> 1100
      await tx('EXPENSE', 100, '2026-03-10'); // -> 1000

      const goal = await makeGoal({ linkedAccountId: accountId });
      const result = await goals.getHistory(userId, goal.id);

      expect(result.mode).toBe('linked');
      expect(result.currentAmount).toBe(1000);
      expect(result.history[0]!.amount).toBe(400); // opening balance
      expect(result.history.find((p) => p.date === '2026-02-10')!.amount).toBe(1100);
      expect(result.history[result.history.length - 1]!.amount).toBe(1000);
    });
  });

  // ==========================================================================
  describe('milestone alerts', () => {
    it('creates one alert when a milestone is crossed, and not again', async () => {
      const goal = await makeGoal({ manualSavedAmount: 300 }); // 30%

      expect((await insights.generateForUser(userId)).created).toBe(1);
      expect(await milestonesFor(goal.id)).toEqual([25]);

      expect((await insights.generateForUser(userId)).created).toBe(0);
    });

    it('creates only the highest milestone when progress jumps', async () => {
      const goal = await makeGoal({ manualSavedAmount: 200 });
      await insights.generateForUser(userId);
      expect(await milestonesFor(goal.id)).toEqual([]); // below 25%

      await prisma.savingsGoal.update({ where: { id: goal.id }, data: { manualSavedAmount: 800 } });
      await insights.generateForUser(userId);
      expect(await milestonesFor(goal.id)).toEqual([75]); // not 25 + 50 + 75
    });

    it('does not bring a dismissed milestone back', async () => {
      const goal = await makeGoal({ manualSavedAmount: 300 });
      await insights.generateForUser(userId);
      await prisma.insight.updateMany({
        where: { userId, type: 'GOAL_MILESTONE' },
        data: { status: 'DISMISSED', dismissedAt: new Date() },
      });

      expect((await insights.generateForUser(userId)).created).toBe(0);
      expect(await milestonesFor(goal.id)).toEqual([25]);

      await prisma.savingsGoal.update({ where: { id: goal.id }, data: { manualSavedAmount: 950 } });
      await insights.generateForUser(userId);
      expect(await milestonesFor(goal.id)).toEqual([25, 90]);
    });

    it('leaves 100% to the achieved alert', async () => {
      const goal = await makeGoal({ manualSavedAmount: 1000 });
      await insights.generateForUser(userId);
      expect(await milestonesFor(goal.id)).toEqual([]);
      expect(await prisma.insight.count({ where: { userId, type: 'GOAL_ACHIEVED' } })).toBe(1);
    });
  });

  // ==========================================================================
  describe('behind-schedule alerts', () => {
    const behindCount = () => prisma.insight.count({ where: { userId, type: 'GOAL_BEHIND' } });

    it('alerts once for an overdue goal and throttles repeats for 14 days', async () => {
      await makeGoal({ manualSavedAmount: 100, targetDate: new Date('2026-01-01') });

      await insights.generateForUser(userId);
      expect(await behindCount()).toBe(1);

      await insights.generateForUser(userId);
      expect(await behindCount()).toBe(1);

      // Dismissing must not cause an immediate re-alert
      await prisma.insight.updateMany({
        where: { userId, type: 'GOAL_BEHIND' },
        data: { status: 'DISMISSED', dismissedAt: new Date() },
      });
      await insights.generateForUser(userId);
      expect(await behindCount()).toBe(1);

      // After 14+ days it may alert again
      await prisma.insight.updateMany({
        where: { userId, type: 'GOAL_BEHIND' },
        data: { createdAt: new Date(Date.now() - 15 * 86_400_000) },
      });
      await insights.generateForUser(userId);
      expect(await behindCount()).toBe(2);
    });

    it('does not alert for a goal without a deadline or one already achieved', async () => {
      await makeGoal({ manualSavedAmount: 100 });
      await makeGoal({ manualSavedAmount: 1000, targetDate: new Date('2026-01-01') });
      await insights.generateForUser(userId);
      expect(await behindCount()).toBe(0);
    });
  });
});
