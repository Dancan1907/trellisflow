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

  private async checkBudgetOverspent(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    let created = 0;

    for (const budget of budgets) {
      const spent = await this.getSpentForBudget(userId, budget);
      const target = Number(budget.amount);

      if (spent > target) {
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
            `You have exceeded your budget of ${budget.currency} ${target} by ${budget.currency} ${(spent - target).toFixed(2)}.`,
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
      const target = Number(budget.amount);
      const percentage = target === 0 ? 0 : (spent / target) * 100;

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
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

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
