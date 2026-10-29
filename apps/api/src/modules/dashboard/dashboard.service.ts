// ============================================================================
// Dashboard Service
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the hero summary: Net Worth + This Month's Cash Flow.
   */
  async getSummary(userId: string) {
    // 1. Fetch the latest net worth snapshot
    const latestSnapshot = await this.prisma.netWorthSnapshot.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    // 2. Calculate this month's cash flow (Income vs Expense)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
    });

    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      if (tx.type === 'INCOME') income += Number(tx.amount);
      if (tx.type === 'EXPENSE') expenses += Number(tx.amount);
    }

    return {
      netWorth: latestSnapshot
        ? {
            total: Number(latestSnapshot.totalNetWorth),
            personal: Number(latestSnapshot.personalNetWorth),
            investments: Number(latestSnapshot.investmentsNetWorth),
            businesses: Number(latestSnapshot.businessesNetWorth),
            currency: latestSnapshot.currency,
          }
        : { total: 0, personal: 0, investments: 0, businesses: 0, currency: 'KES' },
      cashFlow: {
        income,
        expenses,
        net: income - expenses,
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
      },
    };
  }

  /**
   * Get the container cards for the dashboard.
   * Returns net worth per container and account counts.
   */
  async getContainerCards(userId: string) {
    const containers = await this.prisma.container.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        accounts: { where: { status: 'ACTIVE' } },
        summaries: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        _count: {
          select: { accounts: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return containers.map((c) => {
      let netWorth = 0;

      if (c.type === 'EXTERNAL_BUSINESS') {
        const latest = c.summaries[0];
        if (latest) {
          netWorth = Number(latest.assetsValue) - Number(latest.liabilitiesValue);
        }
      } else {
        for (const acc of c.accounts) {
          const balance = Number(acc.currentBalance);
          if (acc.category === 'ASSET') netWorth += balance;
          if (acc.category === 'LIABILITY') netWorth -= balance;
        }
      }

      return {
        id: c.id,
        name: c.name,
        type: c.type,
        currency: c.currency,
        accountCount: c._count.accounts,
        netWorth,
        lastUpdatedAt:
          c.type === 'EXTERNAL_BUSINESS' && c.summaries[0] ? c.summaries[0].date : c.updatedAt,
      };
    });
  }

  /**
   * Get the net worth trend (last N days) for the chart.
   */
  async getNetWorthTrend(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.netWorthSnapshot.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        totalNetWorth: true,
      },
    });
  }

  /**
   * Get the most important insights for the dashboard widget.
   * We prioritize: WARNING > OPPORTUNITY > INFO.
   */
  async getInsights(userId: string) {
    const insights = await this.prisma.insight.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 3, // Top 3 for the dashboard widget
    });

    // Sort by severity so WARNINGs appear first
    const severityOrder = { WARNING: 0, OPPORTUNITY: 1, INFO: 2 };
    return insights.sort(
      (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
    );
  }
}
