// ============================================================================
// Insights Service
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InsightType, InsightSeverity } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.insight.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async dismiss(userId: string, id: string) {
    const insight = await this.prisma.insight.findFirst({
      where: { id, userId, status: 'ACTIVE' },
    });

    if (!insight) {
      throw new Error('Insight not found');
    }

    return this.prisma.insight.update({
      where: { id },
      data: { status: 'DISMISSED', dismissedAt: new Date() },
    });
  }

  async dismissAll(userId: string) {
    return this.prisma.insight.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'DISMISSED', dismissedAt: new Date() },
    });
  }

  async generateForUser(userId: string) {
    let created = 0;

    created += await this.checkBudgetOverspent(userId);
    created += await this.checkBudgetNearLimit(userId);
    created += await this.checkGoalAchieved(userId);

    return { created };
  }

  private async getEffectiveAmount(userId: string, budget: any): Promise<number> {
    const baseAmount = Number(budget.amount);
    if (!budget.rollover) return baseAmount;

    // Calculate rollover from previous period
    const now = new Date();
    let prevStart: Date;
    let prevEnd: Date;

    switch (budget.period) {
      case 'DAILY':
        prevStart = new Date(now);
        prevStart.setDate(prevStart.getDate() - 1);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd = new Date(prevStart);
        prevEnd.setHours(23, 59, 59, 999);
        break;
      case 'WEEKLY':
        prevStart = new Date(now);
        prevStart.setDate(prevStart.getDate() - 7);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd = new Date(prevStart);
        prevEnd.setDate(prevEnd.getDate() + 6);
        prevEnd.setHours(23, 59, 59, 999);
        break;
      case 'MONTHLY':
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'QUARTERLY': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        prevStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        prevEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59, 999);
        break;
      }
      case 'YEARLY':
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      default:
        return baseAmount;
    }

    const prevTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        containerId: budget.containerId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: { gte: prevStart, lte: prevEnd },
        deletedAt: null,
      },
    });
    const prevSpent = prevTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const rolloverBalance = Math.max(0, baseAmount - prevSpent);

    return baseAmount + rolloverBalance;
  }

  private async checkBudgetOverspent(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    let created = 0;

    for (const budget of budgets) {
      const spent = await this.getSpentForBudget(userId, budget);
      const effectiveAmount = await this.getEffectiveAmount(userId, budget);

      if (spent > effectiveAmount) {
        const existing = await this.prisma.insight.findFirst({
          where: {
            userId,
            type: 'BUDGET_OVERSPENT',
            relatedEntityId: budget.id,
            status: 'ACTIVE',
          },
        });

        if (!existing) {
          await this.createInsight(
            userId,
            'BUDGET_OVERSPENT',
            'WARNING',
            'Budget Exceeded',
            `You have exceeded your budget of ${budget.currency} ${effectiveAmount} by ${budget.currency} ${(spent - effectiveAmount).toFixed(2)}.`,
            budget.containerId,
            budget.id,
          );
          created++;
        }
      }
    }
    return created;
  }

  private async checkBudgetNearLimit(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    let created = 0;

    for (const budget of budgets) {
      const spent = await this.getSpentForBudget(userId, budget);
      const effectiveAmount = await this.getEffectiveAmount(userId, budget);
      const percentage = effectiveAmount === 0 ? 0 : (spent / effectiveAmount) * 100;

      if (percentage >= 80 && percentage < 100) {
        const existing = await this.prisma.insight.findFirst({
          where: {
            userId,
            type: 'BUDGET_NEAR_LIMIT',
            relatedEntityId: budget.id,
            status: 'ACTIVE',
          },
        });

        if (!existing) {
          await this.createInsight(
            userId,
            'BUDGET_NEAR_LIMIT',
            'INFO',
            'Approaching Budget Limit',
            `You have used ${Math.round(percentage)}% of your budget for this period.`,
            budget.containerId,
            budget.id,
          );
          created++;
        }
      }
    }
    return created;
  }

  private async checkGoalAchieved(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    let created = 0;

    for (const goal of goals) {
      // Fix: Declare without initial value to satisfy no-useless-assignment
      let currentAmount: number;

      if (goal.linkedAccountId) {
        const acc = await this.prisma.account.findUnique({
          where: { id: goal.linkedAccountId },
        });
        currentAmount = acc ? Number(acc.currentBalance) : 0;
      } else {
        currentAmount = Number(goal.manualSavedAmount || 0);
      }

      if (currentAmount >= Number(goal.targetAmount)) {
        const existing = await this.prisma.insight.findFirst({
          where: {
            userId,
            type: 'GOAL_ACHIEVED',
            relatedEntityId: goal.id,
            status: 'ACTIVE',
          },
        });

        if (!existing) {
          await this.createInsight(
            userId,
            'GOAL_ACHIEVED',
            'OPPORTUNITY',
            'Goal Achieved!',
            `Congratulations! You have reached your savings goal of ${goal.currency} ${goal.targetAmount}.`,
            goal.containerId,
            goal.id,
          );
          created++;
        }
      }
    }
    return created;
  }

  private async getSpentForBudget(userId: string, budget: any): Promise<number> {
    // Replicate the period logic from BudgetsService
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (budget.period) {
      case 'DAILY':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'WEEKLY': {
        const day = now.getDay();
        const diff = now.getDate() - day;
        start = new Date(now.setDate(diff));
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

    return transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  private async createInsight(
    userId: string,
    type: InsightType,
    severity: InsightSeverity,
    title: string,
    message: string,
    containerId: string | null,
    entityId: string,
  ) {
    await this.prisma.insight.create({
      data: {
        id: randomUUID(),
        userId,
        type,
        severity,
        title,
        message,
        relatedContainerId: containerId,
        relatedEntityId: entityId,
        relatedEntityType: type.includes('BUDGET') ? 'budget' : 'goal',
        status: 'ACTIVE',
      },
    });
  }
}
