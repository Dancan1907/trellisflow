// ============================================================================
// Insights Service
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InsightType, InsightSeverity } from '@prisma/client';
import { randomUUID } from 'crypto';
import { GoalsService } from '../goals/goals.service';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private prisma: PrismaService,
    private goalsService: GoalsService,
  ) {}

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
    const checkResults: Array<{ name: string; created: number; status: 'SUCCEEDED' | 'FAILED' }> = [];

    const checks: Array<{ name: string; fn: () => Promise<number> }> = [
      { name: 'checkBudgetOverspent', fn: () => this.checkBudgetOverspent(userId) },
      { name: 'checkBudgetNearLimit', fn: () => this.checkBudgetNearLimit(userId) },
      { name: 'checkGoalAchieved', fn: () => this.checkGoalAchieved(userId) },
      { name: 'checkGoalMilestones', fn: () => this.checkGoalMilestones(userId) },
      { name: 'checkGoalBehind', fn: () => this.checkGoalBehind(userId) },
      { name: 'checkDebtCompleted', fn: () => this.checkDebtCompleted(userId) },
      { name: 'checkTokenExpiring', fn: () => this.checkTokenExpiring(userId) },
      { name: 'checkNetWorthMilestone', fn: () => this.checkNetWorthMilestone(userId) },
      { name: 'checkUnusualSpending', fn: () => this.checkUnusualSpending(userId) },
      { name: 'checkOptimizationOpportunity', fn: () => this.checkOptimizationOpportunity(userId) },
      { name: 'checkRebalanceSuggested', fn: () => this.checkRebalanceSuggested(userId) },
      { name: 'checkProfitDecline', fn: () => this.checkProfitDecline(userId) },
      { name: 'checkRunwayLow', fn: () => this.checkRunwayLow(userId) },
      { name: 'checkFinancialActivitySummary', fn: () => this.checkFinancialActivitySummary(userId) },
      { name: 'checkTopSpendingCategory', fn: () => this.checkTopSpendingCategory(userId) },
    ];

    for (const check of checks) {
      try {
        const count = await check.fn();
        created += count;
        checkResults.push({ name: check.name, created: count, status: 'SUCCEEDED' });
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`Insight check "${check.name}" failed: ${error}`);
        checkResults.push({ name: check.name, created: 0, status: 'FAILED' });
      }
    }

    const failedChecks = checkResults.filter((result) => result.status === 'FAILED').length;
    return {
      created,
      checksExecuted: checkResults.length,
      failedChecks,
      checkResults,
    };
  }

  /**
   * Summarizes posted income and expenses from the last 30 days.
   * Values are grouped by container and currency; transfers are excluded by
   * querying only INCOME and EXPENSE transaction types.
   */
  private async checkFinancialActivitySummary(userId: string): Promise<number> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['INCOME', 'EXPENSE'] },
        status: { in: ['POSTED', 'RECONCILED'] },
        date: { gte: periodStart, lte: now },
        deletedAt: null,
      },
      select: { id: true, containerId: true, type: true, amount: true, currency: true },
    });

    const groups = new Map<string, { containerId: string; currency: string; income: number; expenses: number; count: number; sampleId: string }>();
    for (const tx of transactions) {
      if (!tx.containerId || !tx.currency || !tx.id) continue;
      const key = `${tx.containerId}:${tx.currency}`;
      const group = groups.get(key) ?? {
        containerId: tx.containerId, currency: tx.currency, income: 0, expenses: 0, count: 0, sampleId: tx.id,
      };
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (tx.type === 'INCOME') group.income += amount;
      if (tx.type === 'EXPENSE') group.expenses += amount;
      group.count++;
      groups.set(key, group);
    }

    let created = 0;
    for (const group of groups.values()) {
      if (group.count < 3 || (group.income === 0 && group.expenses === 0)) continue;
      const existing = await this.prisma.insight.findFirst({
        where: {
          userId,
          type: 'FINANCIAL_ACTIVITY_SUMMARY',
          relatedEntityId: group.containerId,
          createdAt: { gte: monthStart },
          status: 'ACTIVE',
        },
      });
      if (existing) continue;

      const net = group.income - group.expenses;
      const direction = net > 0 ? 'positive net cash flow' : net < 0 ? 'expenses exceeded income' : 'income matched expenses';
      const message = `Over the last 30 days, recorded income was ${group.currency} ${Math.round(group.income).toLocaleString()} and recorded expenses were ${group.currency} ${Math.round(group.expenses).toLocaleString()}, resulting in ${direction} of ${group.currency} ${Math.abs(Math.round(net)).toLocaleString()}. This is based on ${group.count} posted or reconciled transactions in this container.`;
      await this.createInsight(
        userId, 'FINANCIAL_ACTIVITY_SUMMARY', net < 0 ? 'WARNING' : 'INFO',
        'Your 30-Day Cash Flow', message, group.containerId, group.containerId,
        { periodDays: 30, income: group.income, expenses: group.expenses, net, currency: group.currency, transactionCount: group.count },
      );
      created++;
    }
    return created;
  }

  /** Highlights the largest category only when it represents a material share of spending. */
  private async checkTopSpendingCategory(userId: string): Promise<number> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId, type: 'EXPENSE', status: { in: ['POSTED', 'RECONCILED'] },
        date: { gte: periodStart, lte: now }, deletedAt: null, categoryId: { not: null },
      },
      select: { id: true, containerId: true, categoryId: true, amount: true, currency: true },
    });

    const groups = new Map<string, { containerId: string; categoryId: string; currency: string; amount: number; count: number; sampleId: string; totalExpenses: number }>();
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      if (!tx.containerId || !tx.categoryId || !tx.currency || !tx.id) continue;
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const scope = `${tx.containerId}:${tx.currency}`;
      totals.set(scope, (totals.get(scope) ?? 0) + amount);
      const key = `${scope}:${tx.categoryId}`;
      const group = groups.get(key) ?? {
        containerId: tx.containerId, categoryId: tx.categoryId, currency: tx.currency,
        amount: 0, count: 0, sampleId: tx.id, totalExpenses: 0,
      };
      group.amount += amount;
      group.count++;
      groups.set(key, group);
    }

    const largestByScope = new Map<string, { group: { containerId: string; categoryId: string; currency: string; amount: number; count: number; sampleId: string; totalExpenses: number }; scope: string }>();
    for (const group of groups.values()) {
      const scope = `${group.containerId}:${group.currency}`;
      group.totalExpenses = totals.get(scope) ?? 0;
      const current = largestByScope.get(scope);
      if (!current || group.amount > current.group.amount) largestByScope.set(scope, { group, scope });
    }

    let created = 0;
    for (const { group, scope } of largestByScope.values()) {
      const share = group.totalExpenses > 0 ? group.amount / group.totalExpenses : 0;
      if (group.count < 2 || group.amount < 1000 || share < 0.3) continue;
      const existing = await this.prisma.insight.findFirst({
        where: {
          userId, type: 'TOP_SPENDING_CATEGORY', relatedEntityId: group.categoryId,
          relatedContainerId: group.containerId, createdAt: { gte: monthStart }, status: 'ACTIVE',
        },
      });
      if (existing) continue;
      const category = await this.prisma.category.findUnique({ where: { id: group.categoryId } });
      const categoryName = category?.name ?? 'Uncategorized spending';
      await this.createInsight(
        userId, 'TOP_SPENDING_CATEGORY', 'INFO',
        `Largest Spending Category: ${categoryName}`,
        `"${categoryName}" was your largest recorded spending category over the last 30 days: ${group.currency} ${Math.round(group.amount).toLocaleString()} (${Math.round(share * 100)}% of categorized expenses) across ${group.count} transactions.`,
        group.containerId, group.categoryId,
        { categoryId: group.categoryId, amount: group.amount, share: Math.round(share * 100), currency: group.currency, transactionCount: group.count, scope },
      );
      created++;
    }
    return created;
  }

  // ==========================================================================
  // NEW — Wave 5.5 Rules
  // ==========================================================================

  /** 1. API tokens expiring within 7 days. Once per token. */
  private async checkTokenExpiring(userId: string) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

    const tokens = await this.prisma.apiToken.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gte: now, lte: sevenDaysFromNow },
      },
      include: { container: { select: { id: true, name: true } } },
    });

    let created = 0;
    for (const token of tokens) {
      const existing = await this.prisma.insight.findFirst({
        where: { userId, type: 'TOKEN_EXPIRING', relatedEntityId: token.id },
      });
      if (existing) continue;

      const daysLeft = Math.ceil((token.expiresAt.getTime() - now.getTime()) / 86_400_000);
      await this.createInsight(
        userId,
        'TOKEN_EXPIRING',
        'WARNING',
        'API Token Expiring Soon',
        `The token "${token.label}" for ${token.container.name} expires in ${daysLeft} day(s). Rotate it to keep the integration running.`,
        token.containerId,
        token.id,
        { daysLeft },
      );
      created++;
    }
    return created;
  }

  /** 2. Net worth crossed a new round-number milestone. Once per milestone level. */
  private async checkNetWorthMilestone(userId: string) {
    const latest = await this.prisma.netWorthSnapshot.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    if (!latest) return 0;

    const total = Number(latest.totalNetWorth);
    const MILESTONES = [100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000];

    const reached = [...MILESTONES].reverse().find((m) => total >= m);
    if (!reached) return 0;

    // Dedupe: only alert for milestones never alerted before
    const previous = await this.prisma.insight.findMany({
      where: { userId, type: 'NET_WORTH_MILESTONE' },
      select: { metadata: true },
    });
    const highestAlerted = Math.max(
      0,
      ...previous.map((i) => (i.metadata as { milestone?: number } | null)?.milestone ?? 0),
    );
    if (reached <= highestAlerted) return 0;

    await this.createInsight(
      userId,
      'NET_WORTH_MILESTONE',
      'OPPORTUNITY',
      `Net Worth Milestone: ${latest.currency} ${reached.toLocaleString()}`,
      `Your total net worth has crossed ${latest.currency} ${reached.toLocaleString()}. Great work!`,
      null,
      latest.id,
      { milestone: reached },
    );
    return 1;
  }

  /** 3. Category spend this month > 150% of 3-month average. Once per category per month. */
  private async checkUnusualSpending(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: threeMonthsAgo, lte: monthEnd },
        deletedAt: null,
        categoryId: { not: null },
      },
      select: { categoryId: true, amount: true, date: true },
    });

    const byCategory = new Map<string, { current: number; past: number }>();
    for (const tx of transactions) {
      if (!tx.categoryId) continue;
      const entry = byCategory.get(tx.categoryId) ?? { current: 0, past: 0 };
      if (tx.date >= monthStart) entry.current += Number(tx.amount);
      else entry.past += Number(tx.amount);
      byCategory.set(tx.categoryId, entry);
    }

    let created = 0;
    for (const [categoryId, { current, past }] of byCategory) {
      const monthlyAvg = past / 3;
      if (monthlyAvg < 100 || current < 1000) continue; // Ignore noise
      if (current < monthlyAvg * 1.5) continue;

      const existing = await this.prisma.insight.findFirst({
        where: {
          userId,
          type: 'UNUSUAL_SPENDING',
          relatedEntityId: categoryId,
          createdAt: { gte: monthStart },
        },
      });
      if (existing) continue;

      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      const name = cat?.name ?? 'a category';
      const pct = Math.round((current / monthlyAvg - 1) * 100);

      await this.createInsight(
        userId,
        'UNUSUAL_SPENDING',
        'WARNING',
        'Unusual Spending Spike',
        `You've spent ${pct}% more on "${name}" this month than your 3-month average.`,
        null,
        categoryId,
        { categoryId, current, monthlyAvg: Math.round(monthlyAvg) },
      );
      created++;
    }
    return created;
  }

  /** 4. Savings exist AND high-interest debt exists. Once per month. */
  private async checkOptimizationOpportunity(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const existing = await this.prisma.insight.findFirst({
      where: { userId, type: 'OPTIMIZATION_OPPORTUNITY', createdAt: { gte: monthStart } },
    });
    if (existing) return 0;

    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        category: 'ASSET',
        accountType: { in: ['SAVINGS', 'CHECKING', 'MOBILE_MONEY', 'PREPAID_CARD', 'CASH'] },
        status: 'ACTIVE',
      },
    });
    const savings = accounts.reduce((s, a) => s + Number(a.currentBalance), 0);
    if (savings < 50_000) return 0;

    const highInterest = await this.prisma.debtPayoffPlan.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        interestRate: { gte: 15 },
        account: { status: 'ACTIVE' },
      },
      include: { account: true },
    });
    if (highInterest.length === 0) return 0;

    const first = highInterest[0]!;
    const totalDebt = highInterest.reduce((s, p) => s + Number(p.account.currentBalance), 0);
    const maxRate = Math.max(...highInterest.map((p) => Number(p.interestRate)));

    await this.createInsight(
      userId,
      'OPTIMIZATION_OPPORTUNITY',
      'OPPORTUNITY',
      'Pay Off High-Interest Debt',
      `You have ${first.account.currency} ${Math.round(savings).toLocaleString()} in savings and ${first.account.currency} ${Math.round(totalDebt).toLocaleString()} in debt at up to ${maxRate}% APR. Consider prioritizing debt payoff.`,
      null,
      first.id,
      { savings, highInterestDebt: totalDebt, maxRate },
    );
    return 1;
  }

  /** 5. Any single asset class > 60% of portfolio. Once per month. */
  private async checkRebalanceSuggested(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const existing = await this.prisma.insight.findFirst({
      where: { userId, type: 'REBALANCE_SUGGESTED', createdAt: { gte: monthStart } },
    });
    if (existing) return 0;

    const holdings = await this.prisma.holding.findMany({
      where: { userId, status: 'OPEN', deletedAt: null },
    });
    if (holdings.length < 2) return 0;

    const totalValue = holdings.reduce((s, h) => s + Number(h.currentValueTotal), 0);
    if (totalValue < 100_000) return 0;

    const byAsset = new Map<string, number>();
    for (const h of holdings) {
      byAsset.set(h.assetClass, (byAsset.get(h.assetClass) ?? 0) + Number(h.currentValueTotal));
    }
    if (byAsset.size < 2) return 0;

    for (const [assetClass, value] of byAsset) {
      const pct = (value / totalValue) * 100;
      if (pct <= 60) continue;

      await this.createInsight(
        userId,
        'REBALANCE_SUGGESTED',
        'OPPORTUNITY',
        'Portfolio Concentration Risk',
        `${Math.round(pct)}% of your portfolio is in ${assetClass.replace(/_/g, ' ').toLowerCase()}. Consider diversifying.`,
        null,
        holdings[0]!.id,
        { assetClass, percentage: Math.round(pct) },
      );
      return 1;
    }
    return 0;
  }

  /** 6. Business income dropped > 25% MoM. Once per business per month. */
  private async checkProfitDecline(userId: string) {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const businesses = await this.prisma.container.findMany({
      where: { userId, type: 'INTERNAL_BUSINESS', status: 'ACTIVE' },
    });

    let created = 0;
    for (const business of businesses) {
      const existing = await this.prisma.insight.findFirst({
        where: {
          userId,
          type: 'PROFIT_DECLINE',
          relatedContainerId: business.id,
          createdAt: { gte: monthStart },
        },
      });
      if (existing) continue;

      const lastTx = await this.prisma.transaction.findMany({
        where: {
          userId,
          containerId: business.id,
          type: 'INCOME',
          date: { gte: lastMonthStart, lte: lastMonthEnd },
          deletedAt: null,
        },
      });
      const lastIncome = lastTx.reduce((s, t) => s + Number(t.amount), 0);

      const prevTx = await this.prisma.transaction.findMany({
        where: {
          userId,
          containerId: business.id,
          type: 'INCOME',
          date: { gte: prevMonthStart, lte: prevMonthEnd },
          deletedAt: null,
        },
      });
      const prevIncome = prevTx.reduce((s, t) => s + Number(t.amount), 0);

      if (prevIncome < 1000) continue;
      if (lastIncome >= prevIncome * 0.75) continue;

      const decline = ((prevIncome - lastIncome) / prevIncome) * 100;

      await this.createInsight(
        userId,
        'PROFIT_DECLINE',
        'WARNING',
        `Profit Decline: ${business.name}`,
        `${business.name}'s income dropped ${Math.round(decline)}% last month (${business.currency} ${Math.round(prevIncome).toLocaleString()} → ${business.currency} ${Math.round(lastIncome).toLocaleString()}).`,
        business.id,
        business.id,
        { prevIncome, lastIncome, declinePct: Math.round(decline) },
      );
      created++;
    }
    return created;
  }

  /** 7. Business cash runway < 3 months. Once per business per 7 days. */
  private async checkRunwayLow(userId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    const businesses = await this.prisma.container.findMany({
      where: { userId, type: 'INTERNAL_BUSINESS', status: 'ACTIVE' },
    });

    let created = 0;
    for (const business of businesses) {
      const existing = await this.prisma.insight.findFirst({
        where: {
          userId,
          type: 'RUNWAY_LOW',
          relatedContainerId: business.id,
          createdAt: { gte: sevenDaysAgo },
        },
      });
      if (existing) continue;

      const accounts = await this.prisma.account.findMany({
        where: {
          userId,
          containerId: business.id,
          category: 'ASSET',
          accountType: { in: ['CHECKING', 'SAVINGS', 'CASH', 'MOBILE_MONEY', 'PREPAID_CARD'] },
          status: 'ACTIVE',
        },
      });
      const cash = accounts.reduce((s, a) => s + Number(a.currentBalance), 0);

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000);
      const expenses = await this.prisma.transaction.findMany({
        where: {
          userId,
          containerId: business.id,
          type: 'EXPENSE',
          date: { gte: ninetyDaysAgo, lte: now },
          deletedAt: null,
        },
      });
      const monthlyBurn = expenses.reduce((s, t) => s + Number(t.amount), 0) / 3;
      if (monthlyBurn <= 0) continue;

      const runway = cash / monthlyBurn;
      if (runway >= 3) continue;

      await this.createInsight(
        userId,
        'RUNWAY_LOW',
        'WARNING',
        `Low Cash Runway: ${business.name}`,
        `${business.name} has ${runway.toFixed(1)} month(s) of runway. Consider reducing expenses or increasing revenue.`,
        business.id,
        business.id,
        { runwayMonths: Math.round(runway * 10) / 10, cash, monthlyBurn },
      );
      created++;
    }
    return created;
  }

  // ==========================================================================
  // Existing rules — UNCHANGED (Wave 5.2 – 5.4)
  // ==========================================================================

  private async getEffectiveAmount(userId: string, budget: any): Promise<number> {
    const baseAmount = Number(budget.amount);
    if (!budget.rollover) return baseAmount;

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
        const q = Math.floor(now.getMonth() / 3);
        prevStart = new Date(now.getFullYear(), (q - 1) * 3, 1);
        prevEnd = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59, 999);
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
    const prevSpent = prevTransactions.reduce((s, tx) => s + Number(tx.amount), 0);
    return baseAmount + Math.max(0, baseAmount - prevSpent);
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
          where: { userId, type: 'BUDGET_OVERSPENT', relatedEntityId: budget.id, status: 'ACTIVE' },
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
      const pct = effectiveAmount === 0 ? 0 : (spent / effectiveAmount) * 100;

      if (pct >= 80 && pct < 100) {
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
            `You have used ${Math.round(pct)}% of your budget for this period.`,
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
      let currentAmount: number;
      if (goal.linkedAccountId) {
        const acc = await this.prisma.account.findUnique({ where: { id: goal.linkedAccountId } });
        currentAmount = acc ? Number(acc.currentBalance) : 0;
      } else {
        currentAmount = Number(goal.manualSavedAmount || 0);
      }

      if (currentAmount >= Number(goal.targetAmount)) {
        const existing = await this.prisma.insight.findFirst({
          where: { userId, type: 'GOAL_ACHIEVED', relatedEntityId: goal.id, status: 'ACTIVE' },
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

  private async checkGoalMilestones(userId: string) {
    const MILESTONES = [25, 50, 75, 90];
    const goals = await this.goalsService.findAll(userId);
    let created = 0;

    for (const goal of goals) {
      const target = Number(goal.targetAmount);
      if (target <= 0) continue;
      const pct = (goal.currentAmount / target) * 100;
      if (pct >= 100) continue;

      const highest = [...MILESTONES].reverse().find((m) => pct >= m);
      if (!highest) continue;

      const previous = await this.prisma.insight.findMany({
        where: { userId, type: 'GOAL_MILESTONE', relatedEntityId: goal.id },
        select: { metadata: true },
      });
      const highestReached = Math.max(
        0,
        ...previous.map((i) => (i.metadata as { milestone?: number } | null)?.milestone ?? 0),
      );
      if (highest <= highestReached) continue;

      await this.createInsight(
        userId,
        'GOAL_MILESTONE',
        'OPPORTUNITY',
        `${highest}% milestone reached`,
        `You've saved ${highest}% of "${goal.name}". Keep going!`,
        goal.containerId,
        goal.id,
        { milestone: highest },
      );
      created++;
    }
    return created;
  }

  private async checkGoalBehind(userId: string) {
    const goals = await this.goalsService.findAll(userId);
    const now = new Date();
    let created = 0;

    for (const goal of goals) {
      if (!goal.targetDate || goal.projection.status === 'ACHIEVED') continue;

      let message: string | null = null;
      if (goal.targetDate < now) {
        message = `"${goal.name}" was due on ${goal.targetDate.toDateString()} and is ${goal.percentage}% complete.`;
      } else if (goal.projection.status === 'BEHIND') {
        const late = Math.abs(goal.projection.daysAhead ?? 0);
        const need = goal.projection.requiredMonthly;
        message =
          `At your current pace "${goal.name}" finishes ${late} days after your target date.` +
          (need
            ? ` Saving about ${goal.currency} ${Math.round(need)} per month would get you there.`
            : '');
      }
      if (!message) continue;

      const since = new Date(Date.now() - 14 * 86_400_000);
      const recent = await this.prisma.insight.findFirst({
        where: { userId, type: 'GOAL_BEHIND', relatedEntityId: goal.id, createdAt: { gte: since } },
      });
      if (recent) continue;

      await this.createInsight(
        userId,
        'GOAL_BEHIND',
        'WARNING',
        'Goal behind schedule',
        message,
        goal.containerId,
        goal.id,
      );
      created++;
    }
    return created;
  }

  private async checkDebtCompleted(userId: string) {
    const plans = await this.prisma.debtPayoffPlan.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { account: true },
    });

    let created = 0;
    for (const plan of plans) {
      if (Number(plan.account.currentBalance) <= 0) {
        const existing = await this.prisma.insight.findFirst({
          where: { userId, type: 'DEBT_COMPLETED', relatedEntityId: plan.id, status: 'ACTIVE' },
        });
        if (!existing) {
          await this.createInsight(
            userId,
            'DEBT_COMPLETED',
            'OPPORTUNITY',
            'Debt Paid Off!',
            `Congratulations! You have fully paid off "${plan.account.name}".`,
            plan.account.containerId,
            plan.id,
          );
          created++;
        }
      }
    }
    return created;
  }

  private async getSpentForBudget(userId: string, budget: any): Promise<number> {
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
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
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

    return transactions.reduce((s, tx) => s + Number(tx.amount), 0);
  }

  private entityTypeFor(type: InsightType): string {
    if (type === 'TOKEN_EXPIRING') return 'api_token';
    if (type === 'NET_WORTH_MILESTONE') return 'snapshot';
    if (type === 'UNUSUAL_SPENDING') return 'category';
    if (type === 'OPTIMIZATION_OPPORTUNITY') return 'debt_plan';
    if (type === 'REBALANCE_SUGGESTED') return 'portfolio';
    if (type === 'PROFIT_DECLINE' || type === 'RUNWAY_LOW') return 'business';
    if (type === 'FINANCIAL_ACTIVITY_SUMMARY') return 'container';
    if (type === 'TOP_SPENDING_CATEGORY') return 'category';
    if (type === 'DEBT_COMPLETED') return 'debt_plan';
    if (type.includes('BUDGET')) return 'budget';
    return 'goal';
  }

  private actionUrlFor(type: InsightType): string | undefined {
    if (type === 'TOKEN_EXPIRING') return '/businesses';
    if (type === 'NET_WORTH_MILESTONE') return '/reports/net-worth';
    if (type === 'UNUSUAL_SPENDING') return '/transactions';
    if (type === 'OPTIMIZATION_OPPORTUNITY' || type === 'DEBT_COMPLETED') return '/debts';
    if (type === 'REBALANCE_SUGGESTED') return '/investments';
    if (type === 'PROFIT_DECLINE' || type === 'RUNWAY_LOW') return '/businesses';
    if (type === 'FINANCIAL_ACTIVITY_SUMMARY') return '/reports';
    if (type === 'TOP_SPENDING_CATEGORY') return '/transactions';
    if (type.includes('GOAL')) return '/goals';
    if (type.includes('BUDGET')) return '/budgets';
    return undefined;
  }

  private async createInsight(
    userId: string,
    type: InsightType,
    severity: InsightSeverity,
    title: string,
    message: string,
    containerId: string | null,
    entityId: string,
    metadata?: Record<string, unknown>,
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
        relatedEntityType: this.entityTypeFor(type),
        actionUrl: this.actionUrlFor(type),
        metadata: metadata as any,
        status: 'ACTIVE',
      },
    });
  }
}
