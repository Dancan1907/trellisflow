import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CashFlowForecastQueryDto } from './dto/cash-flow-forecast-query.dto';
import { backtestVariableCashFlow, computeCashFlowForecast } from './cash-flow-forecasting.engine';

const FORECAST_ACCOUNT_TYPES = [
  'CHECKING',
  'SAVINGS',
  'CASH',
  'MOBILE_MONEY',
  'PREPAID_CARD',
] as const;

@Injectable()
export class CashFlowForecastingService {
  constructor(private readonly prisma: PrismaService) {}

  async forecast(userId: string, query: CashFlowForecastQueryDto) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    asOf.setUTCHours(0, 0, 0, 0);
    const horizonDays = query.horizonDays ?? 90;
    const historyDays = query.historyDays ?? 90;
    const historyStart = new Date(asOf);
    historyStart.setUTCDate(historyStart.getUTCDate() - historyDays);
    const forecastEnd = new Date(asOf);
    forecastEnd.setUTCDate(forecastEnd.getUTCDate() + horizonDays);

    const [accounts, rules, transactions] = await Promise.all([
      this.prisma.account.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          category: 'ASSET',
          accountType: { in: [...FORECAST_ACCOUNT_TYPES] },
        },
        select: {
          id: true,
          name: true,
          currency: true,
          currentBalance: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.recurringRule.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          OR: [{ endDate: null }, { endDate: { gte: asOf } }],
        },
        select: {
          id: true,
          accountId: true,
          transferToAccountId: true,
          type: true,
          amount: true,
          currency: true,
          description: true,
          frequency: true,
          interval: true,
          dayOfMonth: true,
          dayOfWeek: true,
          nextOccurrence: true,
          endDate: true,
          status: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          date: { gte: historyStart },
          status: { in: ['POSTED', 'RECONCILED', 'PENDING'] },
        },
        select: {
          accountId: true,
          type: true,
          amount: true,
          date: true,
          recurringRuleId: true,
          status: true,
        },
      }),
    ]);

    const computed = computeCashFlowForecast({
      asOf,
      horizonDays,
      historyDays,
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        currentBalance: account.currentBalance.toString(),
      })),
      rules: rules.map((rule) => ({
        ...rule,
        amount: rule.amount.toString(),
      })),
      transactions: transactions.map((transaction) => ({
        ...transaction,
        amount: transaction.amount.toString(),
      })),
      incomeAdjustmentPercent: query.incomeAdjustmentPercent ?? 0,
      expenseAdjustmentPercent: query.expenseAdjustmentPercent ?? 0,
    });

    const shortfalls = computed.accounts.flatMap((account) => {
      const first = account.points.find((point) => point.projectedBalance < 0);
      return first
        ? [`${account.accountName} (${account.currency}) is projected to fall below zero on ${first.date}.`]
        : [];
    });

    const accountIdsByCurrency = new Map<string, string[]>();
    for (const account of accounts) {
      const ids = accountIdsByCurrency.get(account.currency) ?? [];
      ids.push(account.id);
      accountIdsByCurrency.set(account.currency, ids);
    }
    const backtests = [...accountIdsByCurrency.entries()].map(([currency, accountIds]) => ({
      currency,
      ...backtestVariableCashFlow({
        transactions: transactions.map((transaction) => ({
          ...transaction,
          amount: transaction.amount.toString(),
        })),
        accountIds,
        asOf,
        historyDays,
      }),
    }));

    return {
      ...computed,
      warnings: [...computed.warnings, ...shortfalls],
      backtesting: backtests,
      generatedAt: new Date().toISOString(),
      scope: {
        accountCount: accounts.length,
        recurringRuleCount: rules.length,
        transactionCount: transactions.length,
        currencies: [...accountIdsByCurrency.keys()],
      },
    };
  }
}
