import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { SavingsGoal } from '@prisma/client';
import { randomUUID } from 'crypto';
import { computeProjection, recentDailyRate, HistoryPoint } from './goal-projection';

const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { container: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(goals.map((g) => this.calculateProgress(g)));
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId, status: 'ACTIVE' },
      include: { container: { select: { name: true } } },
    });
    if (!goal) throw new NotFoundException('Savings goal not found');
    return this.calculateProgress(goal);
  }

  async create(userId: string, dto: CreateGoalDto) {
    const container = await this.prisma.container.findFirst({
      where: { id: dto.containerId, userId },
    });
    if (!container) throw new NotFoundException('Container not found');

    if (dto.linkedAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.linkedAccountId, userId },
      });
      if (!account) throw new NotFoundException('Linked account not found');
    }

    return this.prisma.savingsGoal.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: dto.containerId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        currency: dto.currency,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        linkedAccountId: dto.linkedAccountId,
        notes: dto.notes,
        status: 'ACTIVE',
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.findOne(userId, id);
    return this.prisma.savingsGoal.update({
      where: { id },
      data: {
        name: dto.name,
        targetAmount: dto.targetAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.savingsGoal.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }

  /** Manual goals only: record money added to (or withdrawn from) the goal. */
  async addContribution(userId: string, goalId: string, dto: CreateContributionDto) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id: goalId, userId, status: 'ACTIVE' },
    });
    if (!goal) throw new NotFoundException('Savings goal not found');
    if (goal.linkedAccountId) {
      throw new BadRequestException(
        'This goal tracks a linked account. Add money to the account instead.',
      );
    }
    if (dto.amount === 0) throw new BadRequestException('Amount cannot be zero');

    return this.prisma.$transaction(async (tx) => {
      const contribution = await tx.goalContribution.create({
        data: {
          id: randomUUID(),
          userId,
          goalId,
          amount: dto.amount,
          date: dto.date ? new Date(dto.date) : new Date(iso(new Date())),
          note: dto.note,
        },
      });

      // Recompute from the source of truth (null + x = null in SQL, so no `increment`)
      const agg = await tx.goalContribution.aggregate({
        where: { goalId },
        _sum: { amount: true },
      });
      const total = Number(agg._sum.amount ?? 0);
      if (total < 0) throw new BadRequestException('Withdrawal exceeds the saved amount');

      await tx.savingsGoal.update({ where: { id: goalId }, data: { manualSavedAmount: total } });
      return contribution;
    });
  }

  /** Cumulative history + projection line for the chart. */
  async getHistory(userId: string, goalId: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id: goalId, userId, status: 'ACTIVE' },
    });
    if (!goal) throw new NotFoundException('Savings goal not found');

    const { history, currentAmount } = await this.buildHistory(userId, goal);
    const progress = this.projectionFor(goal, history, currentAmount);

    return {
      mode: goal.linkedAccountId ? ('linked' as const) : ('manual' as const),
      targetAmount: Number(goal.targetAmount),
      currentAmount,
      history,
      projection: progress,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private async calculateProgress(goal: SavingsGoal & { container?: unknown }) {
    const { history, currentAmount } = await this.buildHistory(goal.userId, goal);
    const target = Number(goal.targetAmount);
    const percentage = target === 0 ? 0 : Math.round((currentAmount / target) * 100);

    return {
      ...goal,
      currentAmount,
      remaining: target - currentAmount,
      percentage,
      projection: this.projectionFor(goal, history, currentAmount),
    };
  }

  private projectionFor(goal: SavingsGoal, history: HistoryPoint[], currentAmount: number) {
    return computeProjection({
      currentAmount,
      targetAmount: Number(goal.targetAmount),
      targetDate: goal.targetDate,
      dailyRate: recentDailyRate(history, currentAmount),
    });
  }

  /**
   * Cumulative saved amount per day, ending exactly at the goal's current amount.
   * - Linked: rebuilt BACKWARDS from account.currentBalance, so it always matches reality
   *   (handles opening balances and transfers).
   * - Manual: cumulative sum of contributions.
   */
  private async buildHistory(
    userId: string,
    goal: SavingsGoal,
  ): Promise<{ history: HistoryPoint[]; currentAmount: number }> {
    const todayIso = iso(new Date());

    if (goal.linkedAccountId) {
      const account = await this.prisma.account.findUnique({ where: { id: goal.linkedAccountId } });
      const currentAmount = account ? Number(account.currentBalance) : 0;

      const txs = await this.prisma.transaction.findMany({
        where: { accountId: goal.linkedAccountId, userId, deletedAt: null },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        select: { date: true, amount: true, type: true },
      });

      // INCOME adds, EXPENSE subtracts, TRANSFER rows already carry their sign
      const deltas = txs.map((t) => ({
        date: iso(t.date),
        delta: t.type === 'EXPENSE' ? -Number(t.amount) : Number(t.amount),
      }));
      const totalDelta = deltas.reduce((s, d) => s + d.delta, 0);

      let running = currentAmount - totalDelta; // opening balance
      const history: HistoryPoint[] = [];

      if (deltas.length > 0) {
        const dayBefore = iso(new Date(new Date(deltas[0]!.date).getTime() - DAY_MS));
        history.push({ date: dayBefore, amount: round2(running) });
      }
      for (const d of deltas) {
        running += d.delta;
        const last = history[history.length - 1];
        if (last && last.date === d.date) last.amount = round2(running);
        else history.push({ date: d.date, amount: round2(running) });
      }

      if (history.length === 0) history.push({ date: iso(goal.createdAt), amount: currentAmount });
      const last = history[history.length - 1]!;
      if (last.date < todayIso) history.push({ date: todayIso, amount: round2(currentAmount) });

      return { history, currentAmount };
    }

    const contributions = await this.prisma.goalContribution.findMany({
      where: { goalId: goal.id, userId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: { date: true, amount: true },
    });

    const firstDate = contributions.length > 0 ? iso(contributions[0]!.date) : iso(goal.createdAt);
    const startDate = firstDate < iso(goal.createdAt) ? firstDate : iso(goal.createdAt);
    const history: HistoryPoint[] = [
      { date: iso(new Date(new Date(startDate).getTime() - DAY_MS)), amount: 0 },
    ];

    let running = 0;
    for (const c of contributions) {
      running += Number(c.amount);
      const d = iso(c.date);
      const last = history[history.length - 1]!;
      if (last.date === d) last.amount = round2(running);
      else history.push({ date: d, amount: round2(running) });
    }
    if (history[history.length - 1]!.date < todayIso) {
      history.push({ date: todayIso, amount: round2(running) });
    }

    return { history, currentAmount: round2(running) };
  }
}
