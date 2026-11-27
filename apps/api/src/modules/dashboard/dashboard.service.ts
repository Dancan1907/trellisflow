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
    const [latestSnapshot, user] = await Promise.all([
      this.prisma.netWorthSnapshot.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { reportingCurrency: true },
      }),
    ]);
    const reportingCurrency = user?.reportingCurrency ?? 'KES';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['INCOME', 'EXPENSE'] },
        status: { in: ['POSTED', 'RECONCILED'] },
        date: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      select: { type: true, amount: true, currency: true },
    });

    const cashFlowGroups = new Map<string, { income: number; expenses: number }>();
    for (const transaction of transactions) {
      const group = cashFlowGroups.get(transaction.currency) ?? { income: 0, expenses: 0 };
      if (transaction.type === 'INCOME') group.income += Number(transaction.amount);
      if (transaction.type === 'EXPENSE') group.expenses += Number(transaction.amount);
      cashFlowGroups.set(transaction.currency, group);
    }
    const cashFlowByCurrency = Array.from(cashFlowGroups.entries()).map(([currency, group]) => ({
      currency,
      income: group.income,
      expenses: group.expenses,
      net: group.income - group.expenses,
    })).sort((left, right) => left.currency.localeCompare(right.currency));
    const primaryCashFlow = cashFlowByCurrency.find((group) => group.currency === reportingCurrency) ?? {
      currency: reportingCurrency, income: 0, expenses: 0, net: 0,
    };

    const snapshotBreakdown = latestSnapshot?.breakdown as {
      byCurrency?: Array<Record<string, unknown>>;
    } | null;
    const snapshotCurrency = latestSnapshot?.currency ?? reportingCurrency;

    return {
      netWorth: latestSnapshot
        ? {
            total: Number(latestSnapshot.totalNetWorth),
            personal: Number(latestSnapshot.personalNetWorth),
            investments: Number(latestSnapshot.investmentsNetWorth),
            businesses: Number(latestSnapshot.businessesNetWorth),
            currency: snapshotCurrency,
            byCurrency: snapshotBreakdown?.byCurrency ?? [],
            currencyBreakdownAvailable: Array.isArray(snapshotBreakdown?.byCurrency),
          }
        : {
            total: 0, personal: 0, investments: 0, businesses: 0,
            currency: reportingCurrency, byCurrency: [], currencyBreakdownAvailable: true,
          },
      cashFlow: {
        income: primaryCashFlow.income,
        expenses: primaryCashFlow.expenses,
        net: primaryCashFlow.net,
        currency: reportingCurrency,
        byCurrency: cashFlowByCurrency,
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
          select: { accounts: true, summaries: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const investmentContainerIds = containers
      .filter((container) => container.type === 'INVESTMENT')
      .map((container) => container.id);
    const holdings = investmentContainerIds.length
      ? await this.prisma.holding.findMany({
          where: {
            userId,
            containerId: { in: investmentContainerIds },
            status: 'OPEN',
            deletedAt: null,
          },
          select: { containerId: true, currency: true, currentValueTotal: true },
        })
      : [];
    const holdingsByContainer = new Map<string, Array<{ currency: string; currentValueTotal: number }>>();
    for (const holding of holdings) {
      const items = holdingsByContainer.get(holding.containerId) ?? [];
      items.push({ currency: holding.currency, currentValueTotal: Number(holding.currentValueTotal) });
      holdingsByContainer.set(holding.containerId, items);
    }

    return containers.map((container) => {
      const balances = new Map<string, number>();
      if (container.type === 'EXTERNAL_BUSINESS') {
        const latest = container.summaries[0];
        if (latest) {
          balances.set(
            latest.currency,
            Number(latest.assetsValue) - Number(latest.liabilitiesValue),
          );
        }
      } else {
        for (const account of container.accounts) {
          const balance = Number(account.currentBalance);
          const signedBalance = account.category === 'ASSET' ? balance : -balance;
          balances.set(account.currency, (balances.get(account.currency) ?? 0) + signedBalance);
        }
      }

      for (const holding of holdingsByContainer.get(container.id) ?? []) {
        balances.set(
          holding.currency,
          (balances.get(holding.currency) ?? 0) + holding.currentValueTotal,
        );
      }

      const byCurrency = Array.from(balances.entries()).map(([currency, netWorth]) => ({
        currency,
        netWorth,
      })).sort((left, right) => left.currency.localeCompare(right.currency));
      const primary = byCurrency.find((item) => item.currency === container.currency);
      return {
        id: container.id,
        name: container.name,
        type: container.type,
        currency: container.currency,
        accountCount: container._count.accounts,
        summaryCount: container._count.summaries,
        netWorth: primary?.netWorth ?? 0,
        byCurrency,
        lastSummaryAt: container.type === 'EXTERNAL_BUSINESS' ? (container.summaries[0]?.createdAt ?? null) : null,
        lastUpdatedAt:
          container.type === 'EXTERNAL_BUSINESS' && container.summaries[0] ? container.summaries[0].date : container.updatedAt,
      };
    });
  }

  /**
   * Get the net worth trend (last N days) for the chart.
   */
  async getNetWorthTrend(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { reportingCurrency: true },
    });

    return this.prisma.netWorthSnapshot.findMany({
      where: {
        userId,
        currency: user?.reportingCurrency ?? 'KES',
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
