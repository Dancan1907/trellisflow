// ============================================================================
// Budgets Service
// ============================================================================

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { QueryBudgetsDto } from './dto/query-budgets.dto';
import { BudgetPeriod, Budget } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: QueryBudgetsDto) {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(query.containerId ? { containerId: query.containerId } : {}),
        ...(query.period ? { period: query.period } : {}),
      },
      include: {
        container: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(budgets.map((b) => this.calculateProgress(userId, b)));
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId, status: 'ACTIVE' },
      include: {
        container: { select: { name: true } },
      },
    });

    if (!budget) throw new NotFoundException('Budget not found');
    return this.calculateProgress(userId, budget);
  }

  async create(userId: string, dto: CreateBudgetDto) {
    const container = await this.prisma.container.findFirst({
      where: { id: dto.containerId, userId },
    });
    if (!container) throw new NotFoundException('Container not found');

    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        containerId: dto.containerId,
        categoryId: dto.categoryId,
        period: dto.period,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      throw new ConflictException('An active budget for this category and period already exists.');
    }

    return this.prisma.budget.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: dto.containerId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        currency: dto.currency,
        period: dto.period,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
        rollover: dto.rollover ?? false,
        method: 'TARGET',
        status: 'ACTIVE',
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOne(userId, id);
    return this.prisma.budget.update({
      where: { id },
      data: {
        amount: dto.amount,
        rollover: dto.rollover,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.budget.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }

  /**
   * Helper: Calculate the start and end dates for a budget's current period.
   */
  private getPeriodDates(period: BudgetPeriod): { start: Date; end: Date } {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'DAILY':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'WEEKLY': {
        const day = now.getDay();
        const diff = now.getDate() - day;
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'MONTHLY':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'QUARTERLY': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        end = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999);
        break;
      }
      case 'YEARLY':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    return { start, end };
  }

  /**
   * Helper: Calculate spent, remaining, and percentage for a single budget.
   */
  private async calculateProgress(userId: string, budget: Budget & { container?: any }) {
    const { start, end } = this.getPeriodDates(budget.period);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        containerId: budget.containerId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: { gte: start, lte: end },
        deletedAt: null,
      },
    });
    const spent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const amount = Number(budget.amount);
    const remaining = amount - spent;
    const percentage = amount === 0 ? 0 : Math.round((spent / amount) * 100);
    return {
      ...budget,
      spent,
      remaining,
      percentage,
    };
  }

  /**
   * Get a summary report of all budgets vs. actual spending.
   */
  async getReport(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { container: { select: { name: true } } },
    });
    const report = await Promise.all(budgets.map((b) => this.calculateProgress(userId, b)));
    let totalTarget = 0;
    let totalSpent = 0;

    for (const b of report) {
      totalTarget += Number(b.amount);
      totalSpent += b.spent;
    }
    return {
      budgets: report,
      summary: {
        totalTarget,
        totalSpent,
        totalRemaining: totalTarget - totalSpent,
        overallPercentage: totalTarget === 0 ? 0 : Math.round((totalSpent / totalTarget) * 100),
      },
    };
  }

  /**
   * Copy all active budgets from the previous month to the current month.
   */
  async copyPreviousMonth(userId: string) {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const previousBudgets = await this.prisma.budget.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        createdAt: { lt: currentMonth },
      },
    });

    let copiedCount = 0;
    const errors: string[] = [];

    for (const oldBudget of previousBudgets) {
      try {
        const existing = await this.prisma.budget.findFirst({
          where: {
            userId,
            containerId: oldBudget.containerId,
            categoryId: oldBudget.categoryId,
            period: oldBudget.period,
            status: 'ACTIVE',
            createdAt: { gte: currentMonth },
          },
        });
        if (!existing) {
          await this.prisma.budget.create({
            data: {
              id: randomUUID(),
              userId,
              containerId: oldBudget.containerId,
              categoryId: oldBudget.categoryId,
              amount: oldBudget.amount,
              currency: oldBudget.currency,
              period: oldBudget.period,
              rollover: oldBudget.rollover,
              method: oldBudget.method,
              status: 'ACTIVE',
            },
          });
          copiedCount++;
        }
      } catch (err) {
        errors.push(`Failed to copy budget for category ${oldBudget.categoryId}: ${err}`);
      }
    }
    return { copied: copiedCount, skipped: previousBudgets.length - copiedCount, errors };
  }
}
