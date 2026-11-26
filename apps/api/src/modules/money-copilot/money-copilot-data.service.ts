import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';

type DateRange = { from: string; to: string };

const STOP_WORDS = new Set([
  'find', 'search', 'get', 'list', 'please',
  'how', 'much', 'did', 'does', 'what', 'when', 'where', 'show', 'tell',
  'me', 'my', 'the', 'for', 'and', 'was', 'were', 'have', 'has', 'had',
  'about', 'with', 'from', 'into', 'last', 'this', 'month', 'week', 'year',
  'spend', 'spent', 'spending', 'transaction', 'transactions', 'payment',
  'payments', 'purchase', 'purchases', 'expense', 'expenses', 'income',
  'business', 'businesses', 'investment', 'investments', 'account', 'accounts',
]);

@Injectable()
export class MoneyCopilotDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businesses: BusinessesService,
  ) {}

  async buildContext(userId: string, question: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, reportingCurrency: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const timezone = this.validTimezone(user.timezone);
    const today = this.todayInTimezone(timezone);
    const monthStart = `${today.slice(0, 7)}-01`;

    const [snapshot, accounts, monthTransactionResult, recentTransactions] = await Promise.all([
      this.prisma.netWorthSnapshot.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        select: {
          date: true,
          totalNetWorth: true,
          personalNetWorth: true,
          investmentsNetWorth: true,
          businessesNetWorth: true,
          currency: true,
        },
      }),
      this.prisma.account.findMany({
        where: { userId, status: 'ACTIVE', deletedAt: null },
        select: {
          name: true,
          category: true,
          accountType: true,
          currency: true,
          currentBalance: true,
          container: { select: { name: true, type: true, status: true } },
        },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.findTransactionsInRange(userId, monthStart, today, {
        type: true,
        amount: true,
        currency: true,
        date: true,
      }),
      this.prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        select: {
          type: true,
          amount: true,
          currency: true,
          date: true,
          description: true,
          account: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
    ]);

    const accountBalancesByCurrency = new Map<string, {
      assets: number; liabilities: number; net: number; accounts: Array<Record<string, unknown>>;
    }>();
    for (const account of accounts) {
      if (account.container.status !== 'ACTIVE') continue;
      const currency = account.currency;
      const group = accountBalancesByCurrency.get(currency) ?? {
        assets: 0, liabilities: 0, net: 0, accounts: [],
      };
      const balance = Number(account.currentBalance);
      if (account.category === 'ASSET') group.assets += balance;
      else group.liabilities += balance;
      group.net = group.assets - group.liabilities;
      group.accounts.push({
        name: account.name,
        container: account.container.name,
        category: account.category,
        accountType: account.accountType,
        balance,
      });
      accountBalancesByCurrency.set(currency, group);
    }

    const monthCashFlow = this.aggregateCashFlow(monthTransactionResult.transactions, monthStart, today);
    const context: Record<string, unknown> = {
      asOf: today,
      timezone,
      reportingCurrency: user.reportingCurrency,
      netWorthSnapshot: snapshot ? {
        date: this.dateKey(snapshot.date),
        total: Number(snapshot.totalNetWorth),
        personal: Number(snapshot.personalNetWorth),
        investments: Number(snapshot.investmentsNetWorth),
        businesses: Number(snapshot.businessesNetWorth),
        currency: snapshot.currency,
        source: 'latest saved net-worth snapshot',
      } : null,
      accountBalancesByCurrency: Array.from(accountBalancesByCurrency.entries()).map(([currency, data]) => ({
        currency, assets: this.money(data.assets), liabilities: this.money(data.liabilities),
        net: this.money(data.net), accounts: data.accounts,
      })),
      currentMonthCashFlow: { from: monthStart, to: today, byCurrency: monthCashFlow },
      recentTransactions: recentTransactions.map((transaction) => ({
        date: this.dateKey(transaction.date),
        type: transaction.type,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        description: transaction.description,
        account: transaction.account.name,
        category: transaction.category?.name ?? 'Uncategorized',
      })),
      dataLimitations: [
        'Amounts in different currencies are not converted or added together.',
        'Net worth is taken from the latest saved snapshot and may not reflect changes after its date.',
        'Account balances are current account records and are not the same as a historical net-worth snapshot.',
        'Transfers are excluded from income and expense cash-flow totals.',
        ...(monthTransactionResult.truncated ? ['The current-month transaction calculation reached its 5,000-record safety cap and may be incomplete.'] : []),
      ],
    };

    const lower = question.toLowerCase();
    if (/spend|spent|spending|expense|expenses|category|cost|where.*money|breakdown/.test(lower)) {
      const range = this.resolveDateRange(question, timezone);
      context.spendingAnalysis = await this.getSpendingAnalysis(userId, range);
    }
    if (/invest|portfolio|holding|stock|shares|crypto|asset class|unrealized|unrealised/.test(lower)) {
      context.investments = await this.getInvestmentSummary(userId);
    }
    if (/business|businesses|company|revenue|profit|runway|cash burn/.test(lower)) {
      const range = this.resolveDateRange(question, timezone);
      context.businessPerformance = await this.getBusinessPerformance(userId, range);
    }
    if (/spend|spent|transaction|transactions|payment|purchase|merchant|paid|deposit|withdrawal|transfer/.test(lower)) {
      context.transactionLookup = await this.lookupTransactions(userId, question);
    }

    return context;
  }

  private async getSpendingAnalysis(userId: string, range: DateRange) {
    const result = await this.findTransactionsInRange(userId, range.from, range.to, {
      type: true,
      amount: true,
      currency: true,
      date: true,
      category: { select: { name: true } },
    });
    const groups = new Map<string, { currency: string; category: string; amount: number; count: number }>();
    for (const transaction of result.transactions) {
      if (transaction.type !== 'EXPENSE') continue;
      const category = transaction.category?.name ?? 'Uncategorized';
      const key = `${transaction.currency}:${category}`;
      const group = groups.get(key) ?? { currency: transaction.currency, category, amount: 0, count: 0 };
      group.amount += Number(transaction.amount);
      group.count += 1;
      groups.set(key, group);
    }
    const byCurrency = new Map<string, { total: number; transactionCount: number }>();
    for (const group of groups.values()) {
      const total = byCurrency.get(group.currency) ?? { total: 0, transactionCount: 0 };
      total.total += group.amount;
      total.transactionCount += group.count;
      byCurrency.set(group.currency, total);
    }
    return {
      from: range.from,
      to: range.to,
      totals: Array.from(byCurrency.entries()).map(([currency, value]) => ({
        currency, totalExpenses: this.money(value.total), transactionCount: value.transactionCount,
      })),
      byCategory: Array.from(groups.values())
        .map((group) => ({ ...group, amount: this.money(group.amount) }))
        .sort((a, b) => b.amount - a.amount),
      truncated: result.truncated,
      note: result.truncated
        ? 'The calculation reached its 5,000-record safety cap and may be incomplete. Expense totals include recorded non-deleted EXPENSE transactions; transfers are excluded.'
        : 'Expense totals are based on recorded, non-deleted EXPENSE transactions. Transfers are excluded.',
    };
  }

  private async getInvestmentSummary(userId: string) {
    const holdings = await this.prisma.holding.findMany({
      where: { userId, status: 'OPEN', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        name: true, symbol: true, assetClass: true, currency: true,
        costBasisTotal: true, currentValueTotal: true,
      },
    });
    const groups = new Map<string, {
      costBasis: number; currentValue: number; count: number;
      byAssetClass: Map<string, { value: number; count: number }>;
    }>();
    for (const holding of holdings) {
      const group = groups.get(holding.currency) ?? {
        costBasis: 0, currentValue: 0, count: 0, byAssetClass: new Map(),
      };
      const cost = Number(holding.costBasisTotal);
      const value = Number(holding.currentValueTotal);
      group.costBasis += cost;
      group.currentValue += value;
      group.count += 1;
      const asset = group.byAssetClass.get(holding.assetClass) ?? { value: 0, count: 0 };
      asset.value += value;
      asset.count += 1;
      group.byAssetClass.set(holding.assetClass, asset);
      groups.set(holding.currency, group);
    }
    return {
      byCurrency: Array.from(groups.entries()).map(([currency, group]) => ({
        currency,
        holdingCount: group.count,
        costBasis: this.money(group.costBasis),
        currentValue: this.money(group.currentValue),
        unrealizedGain: this.money(group.currentValue - group.costBasis),
        byAssetClass: Array.from(group.byAssetClass.entries()).map(([assetClass, value]) => ({
          assetClass, currentValue: this.money(value.value), holdingCount: value.count,
        })),
      })),
      holdings: holdings.slice(0, 30).map((holding) => ({
        name: holding.name, symbol: holding.symbol, assetClass: holding.assetClass,
        currency: holding.currency, costBasis: Number(holding.costBasisTotal),
        currentValue: Number(holding.currentValueTotal),
      })),
      note: 'Unrealized gain is current recorded value minus cost basis. It is not a realized return and does not include fees, taxes, or cash flows.',
    };
  }

  private async getBusinessPerformance(userId: string, range: DateRange) {
    const businesses = await this.prisma.container.findMany({
      where: {
        userId, status: 'ACTIVE',
        type: { in: ['INTERNAL_BUSINESS', 'EXTERNAL_BUSINESS'] },
      },
      select: { id: true, name: true, type: true, currency: true },
      orderBy: { name: 'asc' },
      take: 15,
    });
    return Promise.all(businesses.map(async (business) => {
      try {
        const netWorth = await this.businesses.getNetWorth(userId, business.id);
        if (business.type === 'EXTERNAL_BUSINESS') {
          return {
            name: business.name, type: business.type, currency: business.currency,
            netWorth: netWorth.netWorth,
            note: 'External business net worth comes from its latest saved summary; transaction-level P&L and runway are not available here.',
          };
        }
        const [pnl, runway] = await Promise.all([
          this.businesses.getPnl(userId, business.id, { from: range.from, to: range.to }),
          this.businesses.getRunway(userId, business.id),
        ]);
        return {
          name: business.name, type: business.type, currency: business.currency,
          netWorth: netWorth.netWorth,
          profitAndLoss: {
            from: pnl.from, to: pnl.to, income: pnl.totalIncome,
            expenses: pnl.totalExpenses, netProfit: pnl.netProfit,
            byCategory: pnl.byCategory.slice(0, 10),
          },
          cashRunwayEstimate: runway,
          note: 'Runway is an estimate based on the last 90 days of recorded expenses and current liquid account balances; it is not a guaranteed forecast.',
        };
      } catch {
        return {
          name: business.name, type: business.type, currency: business.currency,
          unavailable: 'Some business metrics could not be retrieved.',
        };
      }
    }));
  }

  private async lookupTransactions(userId: string, question: string) {
    const terms = (question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])
      .filter((term) => !STOP_WORDS.has(term))
      .slice(0, 3);
    const where: Prisma.TransactionWhereInput = { userId, deletedAt: null };
    if (terms.length) {
      where.OR = terms.map((term) => ({
        description: { contains: term, mode: 'insensitive' },
      }));
    }
    let transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 8,
      select: {
        type: true, amount: true, currency: true, date: true, description: true,
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
    return {
      searchTerms: terms,
      matchedCount: transactions.length,
      transactions: transactions.map((transaction) => ({
        date: this.dateKey(transaction.date), type: transaction.type,
        amount: Number(transaction.amount), currency: transaction.currency,
        description: transaction.description, account: transaction.account.name,
        category: transaction.category?.name ?? 'Uncategorized',
      })),
      note: terms.length
        ? 'Search is limited to transaction descriptions. No unrelated transactions are substituted when there are no matches.'
        : 'These are the most recent recorded transactions.',
    };
  }

  private async findTransactionsInRange(
    userId: string,
    from: string,
    to: string,
    select: Prisma.TransactionSelect,
  ): Promise<{ transactions: Array<Record<string, any>>; truncated: boolean }> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId, deletedAt: null,
        date: { gte: this.addDays(this.dateAsUtc(from), -1), lte: this.addDays(this.dateAsUtc(to), 1) },
      },
      select: { ...select, type: true, date: true },
      orderBy: { date: 'asc' },
      take: 5001,
    }) as Array<Record<string, any>>;
    const inRange = rows.filter((row) => {
      const date = this.dateKey(row.date);
      return date >= from && date <= to;
    });
    return { transactions: inRange.slice(0, 5000), truncated: rows.length > 5000 };
  }

  private aggregateCashFlow(rows: Array<Record<string, any>>, from: string, to: string) {
    const groups = new Map<string, { income: number; expenses: number; net: number }>();
    for (const row of rows) {
      if (row.type !== 'INCOME' && row.type !== 'EXPENSE') continue;
      const group = groups.get(row.currency) ?? { income: 0, expenses: 0, net: 0 };
      if (row.type === 'INCOME') group.income += Number(row.amount);
      else group.expenses += Number(row.amount);
      group.net = group.income - group.expenses;
      groups.set(row.currency, group);
    }
    return Array.from(groups.entries()).map(([currency, group]) => ({
      currency, income: this.money(group.income), expenses: this.money(group.expenses),
      net: this.money(group.net), from, to,
    }));
  }

  private resolveDateRange(question: string, timezone: string): DateRange {
    const today = this.todayInTimezone(timezone);
    const date = this.dateAsUtc(today);
    if (/last\s+7\s+days|past\s+week|last\s+week/i.test(question)) {
      return { from: this.dateKey(this.addDays(date, -6)), to: today };
    }
    if (/last\s+90\s+days|past\s+90\s+days|last\s+3\s+months/i.test(question)) {
      return { from: this.dateKey(this.addDays(date, -89)), to: today };
    }
    if (/last\s+30\s+days|past\s+30\s+days/i.test(question)) {
      return { from: this.dateKey(this.addDays(date, -29)), to: today };
    }
    if (/last\s+month|previous\s+month/i.test(question)) {
      const firstThisMonth = this.dateAsUtc(`${today.slice(0, 7)}-01`);
      const lastPrevious = this.addDays(firstThisMonth, -1);
      return {
        from: `${lastPrevious.getUTCFullYear()}-${String(lastPrevious.getUTCMonth() + 1).padStart(2, '0')}-01`,
        to: this.dateKey(lastPrevious),
      };
    }
    if (/this\s+quarter|quarter\s+to\s+date/i.test(question)) {
      const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
      const quarterStart = new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1));
      return { from: this.dateKey(quarterStart), to: today };
    }
    if (/this\s+year|year\s+to\s+date/i.test(question)) {
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    }
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }

  private validTimezone(value: string | null | undefined): string {
    if (!value) return 'UTC';
    try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return value; }
    catch { return 'UTC'; }
  }

  private todayInTimezone(timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  private dateAsUtc(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private money(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
