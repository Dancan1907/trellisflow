import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { QueryPnlDto } from './dto/query-pnl.dto';
import { ConvertToExternalDto } from './dto/convert-to-external.dto';
import { randomUUID } from 'crypto';
import { DEFAULT_BUSINESS_CATEGORIES } from '../../common/constants/default-business-categories';
import {
  Account,
  BusinessProfile,
  BusinessType,
  Container,
  ExternalBusinessSource,
  Prisma,
  Summary,
} from '@prisma/client';
import { serializeSummary } from '../summaries/summary.util';

/** Account types that count as liquid cash for runway purposes. */
const CASH_ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CASH', 'MOBILE_MONEY', 'PREPAID_CARD'];

/** Shared include used by both the list and detail reads. */
const businessInclude = {
  businessProfile: true,
  externalSource: true,
  accounts: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } },
  summaries: {
    where: { deletedAt: null },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 1,
  },
  _count: { select: { summaries: true } },
} satisfies Prisma.ContainerInclude;

type BusinessWithDetails = Prisma.ContainerGetPayload<{ include: typeof businessInclude }>;

type BusinessNetWorth = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

type BusinessWithProfile = Container & {
  businessProfile: BusinessProfile | null;
};

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  // ==========================================================================
  // Create
  // ==========================================================================

  async create(userId: string, dto: CreateBusinessDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.currency.length !== 3) {
      throw new BadRequestException('Currency must be a 3-letter ISO code');
    }

    const type = dto.type ?? 'INTERNAL_BUSINESS';

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const containerId = randomUUID();
          const profileId = randomUUID();

          // 1. Create the container
          const container = await tx.container.create({
            data: {
              id: containerId,
              userId,
              type,
              name: dto.name,
              currency: dto.currency.toUpperCase(),
              status: 'ACTIVE',
            },
          });

          // 2. Create the business profile (both internal and external)
          const profile = await tx.businessProfile.create({
            data: {
              id: profileId,
              containerId,
              businessType: dto.businessType,
              startDate: dto.startDate ? new Date(dto.startDate) : null,
              notes: dto.notes ?? null,
              logoUrl: dto.logoUrl ?? null,
            },
          });

          // 3. Internal businesses get categories; external ones get a source
          let categoriesCreated = 0;
          let source: ExternalBusinessSource | null = null;

          if (type === 'INTERNAL_BUSINESS') {
            await tx.category.createMany({
              data: DEFAULT_BUSINESS_CATEGORIES.map((cat) => ({
                id: randomUUID(),
                userId,
                containerId,
                name: cat.name,
                type: cat.type,
                icon: cat.icon,
                isSystem: true,
                status: 'ACTIVE',
              })),
            });
            categoriesCreated = DEFAULT_BUSINESS_CATEGORIES.length;
          } else {
            source = await tx.externalBusinessSource.create({
              data: {
                id: randomUUID(),
                containerId,
                sourceType: 'MANUAL',
                syncInterval: 'MANUAL',
              },
            });
          }

          // 4. Return the assembled response
          return {
            id: container.id,
            name: container.name,
            type: container.type,
            currency: container.currency,
            status: container.status,
            createdAt: container.createdAt,
            businessProfile: {
              id: profile.id,
              businessType: profile.businessType,
              startDate: profile.startDate,
              notes: profile.notes,
              logoUrl: profile.logoUrl,
            },
            externalSource: source
              ? {
                  sourceType: source.sourceType,
                  syncInterval: source.syncInterval,
                  lastSummaryAt: source.lastSummaryAt,
                  lastSummaryDate: source.lastSummaryDate,
                }
              : null,
            categoriesCreated,
          };
        },
        { timeout: 15000 }, // 15s timeout instead of default 5s
      );
    } catch (error) {
      console.error('[BusinessesService.create] error:', error);
      throw error;
    }
  }

  // ==========================================================================
  // Read
  // ==========================================================================

  async findAll(userId: string) {
    const containers = await this.prisma.container.findMany({
      where: {
        userId,
        type: { in: ['INTERNAL_BUSINESS', 'EXTERNAL_BUSINESS'] },
        status: 'ACTIVE',
      },
      include: businessInclude,
      orderBy: { createdAt: 'desc' },
    });

    return containers.map((container) => this.toSummary(container));
  }

  async findOne(userId: string, id: string) {
    const container = await this.getBusinessWithDetails(userId, id);

    const accounts =
      container.type === 'INTERNAL_BUSINESS'
        ? container.accounts.map((account) => ({
            id: account.id,
            name: account.name,
            category: account.category,
            accountType: account.accountType,
            currency: account.currency,
            currentBalance: this.money(Number(account.currentBalance)),
            institution: account.institution,
            status: account.status,
          }))
        : [];

    return {
      ...this.toSummary(container),
      accounts,
    };
  }

  // ==========================================================================
  // Update / Archive
  // ==========================================================================

  async update(userId: string, id: string, dto: UpdateBusinessDto) {
    await this.getOwnedBusiness(userId, id);

    const containerData: { name?: string } = {};
    const profileData: { businessType?: BusinessType; notes?: string; logoUrl?: string } = {};

    if (dto.name !== undefined) containerData.name = dto.name;
    if (dto.businessType !== undefined) profileData.businessType = dto.businessType;
    if (dto.notes !== undefined) profileData.notes = dto.notes;
    if (dto.logoUrl !== undefined) profileData.logoUrl = dto.logoUrl;

    // Nothing to change — return the current state rather than opening a transaction.
    if (Object.keys(containerData).length === 0 && Object.keys(profileData).length === 0) {
      return this.findOne(userId, id);
    }

    await this.prisma.$transaction(
      async (tx) => {
        if (Object.keys(containerData).length > 0) {
          await tx.container.update({ where: { id }, data: containerData });
        }

        if (Object.keys(profileData).length > 0) {
          const result = await tx.businessProfile.updateMany({
            where: { containerId: id },
            data: profileData,
          });

          // Every business created through this service has a profile, but a
          // container created by another path (e.g. directly via the containers
          // module) might not.
          if (result.count === 0) {
            throw new NotFoundException('Business profile not found');
          }
        }
      },
      { timeout: 15000 },
    );

    return this.findOne(userId, id);
  }

  async archive(userId: string, id: string) {
    const container = await this.getOwnedBusiness(userId, id);

    const archivedAt = new Date();
    await this.prisma.container.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt },
    });

    return {
      id: container.id,
      name: container.name,
      type: container.type,
      currency: container.currency,
      status: 'ARCHIVED' as const,
      archivedAt,
    };
  }

  // ==========================================================================
  // Convert Internal → External
  // ==========================================================================

  /**
   * Converts an INTERNAL_BUSINESS to an EXTERNAL_BUSINESS in place.
   *
   * Continuity guarantees:
   * - The Container row is kept (same `id`), so every historical NetWorthSnapshot
   *   that already recorded this business stays correct — snapshots don't recompute.
   * - The internal accounts are ARCHIVED (not deleted) so their transactions stay
   *   for audit and the archived balances remain inspectable.
   * - A seed `Summary` is written from today's internal net worth, so future net
   *   worth calculations (which read Summary for external businesses) do not
   *   immediately drop to zero before the user's first real external summary.
   * - Active PROFIT_DECLINE / RUNWAY_LOW insights for this business are expired,
   *   since those rules no longer apply to an external business.
   * - An AuditLog row is written recording the type change.
   *
   * One-way: there is no reverse (external → internal) conversion.
   */
  async convertToExternal(userId: string, id: string, dto: ConvertToExternalDto = {}) {
    const container = await this.getBusinessWithDetails(userId, id);

    if (container.type !== 'INTERNAL_BUSINESS') {
      throw new BadRequestException('Only internal businesses can be converted to external');
    }

    // Compute the final internal net worth to seed the first external summary.
    const seedNetWorth = this.calculateNetWorth(container.accounts);
    const today = this.startOfUtcDay(new Date());
    const auditId = randomUUID();

    const result = await this.prisma.$transaction(
      async (tx) => {
        // 1. Flip the container type. Keep the same row for snapshot continuity.
        const updated = await tx.container.update({
          where: { id },
          data: { type: 'EXTERNAL_BUSINESS' },
        });

        // 2. Create the ExternalBusinessSource (external businesses have exactly one).
        const source = await tx.externalBusinessSource.create({
          data: {
            id: randomUUID(),
            containerId: id,
            sourceType: 'MANUAL',
            syncInterval: 'MANUAL',
            lastSummaryDate: today,
            lastSummaryAt: new Date(),
          },
        });

        // 3. Archive the internal accounts. Transactions remain untouched.
        const archivedAt = new Date();
        await tx.account.updateMany({
          where: { containerId: id, status: 'ACTIVE' },
          data: { status: 'ARCHIVED', archivedAt },
        });

        // 4. Seed the first external Summary from today's internal net worth so
        //    net worth does not drop to zero on conversion day.
        const seedSummary = await tx.summary.create({
          data: {
            id: randomUUID(),
            userId,
            containerId: id,
            date: today,
            period: 'DAY',
            income: 0,
            expenses: 0,
            transfersIn: 0,
            transfersOut: 0,
            cashBalance: seedNetWorth.totalAssets,
            assetsValue: seedNetWorth.totalAssets,
            liabilitiesValue: seedNetWorth.totalLiabilities,
            currency: container.currency,
            source: 'MANUAL',
            notes:
              dto.note ??
              'Opening summary generated automatically when converting from internal to external.',
          },
        });

        // 5. Expire insights that no longer apply to external businesses.
        await tx.insight.updateMany({
          where: {
            userId,
            relatedContainerId: id,
            type: { in: ['PROFIT_DECLINE', 'RUNWAY_LOW'] },
            status: 'ACTIVE',
          },
          data: { status: 'EXPIRED', expiresAt: new Date() },
        });

        // 6. Audit log — record the type change on the container itself.
        await tx.auditLog.create({
          data: {
            id: auditId,
            userId,
            actorType: 'USER',
            actorId: userId,
            entityType: 'container',
            entityId: id,
            action: 'UPDATE',
            before: { type: 'INTERNAL_BUSINESS' },
            after: {
              type: 'EXTERNAL_BUSINESS',
              seedSummaryId: seedSummary.id,
              externalSourceId: source.id,
            },
            changedFields: ['type'],
          },
        });

        return { updated, source, seedSummary };
      },
      { timeout: 15000 },
    );

    return {
      id: result.updated.id,
      name: result.updated.name,
      type: result.updated.type,
      currency: result.updated.currency,
      status: result.updated.status,
      externalSource: {
        sourceType: result.source.sourceType,
        syncInterval: result.source.syncInterval,
        lastSummaryAt: result.source.lastSummaryAt,
        lastSummaryDate: result.source.lastSummaryDate,
      },
      seedSummary: {
        id: result.seedSummary.id,
        date: this.formatDate(result.seedSummary.date),
        netWorth: seedNetWorth.netWorth,
        currency: result.seedSummary.currency,
      },
    };
  }

  // ==========================================================================
  // Analytics — net worth, P&L, runway
  // ==========================================================================

  async getNetWorth(userId: string, id: string) {
    const container = await this.getBusinessWithDetails(userId, id);

    const netWorth =
      container.type === 'EXTERNAL_BUSINESS'
        ? this.netWorthFromSummary(container.summaries[0] ?? null)
        : this.calculateNetWorth(container.accounts);

    return {
      businessId: container.id,
      currency: container.currency,
      ...netWorth,
    };
  }

  /**
   * Profit & Loss for a date range (defaults to the last 30 days, inclusive).
   * Only INCOME and EXPENSE transactions are counted — transfers are excluded,
   * because moving money between the business's own accounts is not profit.
   */
  async getPnl(userId: string, id: string, query: QueryPnlDto = {}) {
    const container = await this.getOwnedBusiness(userId, id);
    this.assertInternal(container, 'P&L');

    const to = query.to ? this.parseDateOnly(query.to) : this.startOfUtcDay(new Date());
    const from = query.from ? this.parseDateOnly(query.from) : this.addDays(to, -29);
    if (from > to) throw new BadRequestException('`from` must be on or before `to`');

    const fromKey = this.formatDate(from);
    const toKey = this.formatDate(to);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        containerId: container.id,
        type: { in: ['INCOME', 'EXPENSE'] },
        status: { in: ['POSTED', 'RECONCILED'] },
        deletedAt: null,
        date: { gte: this.addDays(from, -1), lte: this.addDays(to, 1) },
      },
      include: { category: { select: { id: true, name: true } } },
    });

    const groups = new Map<string, {
      income: number;
      expenses: number;
      byCategory: Map<string, {
        categoryId: string | null;
        categoryName: string;
        type: 'INCOME' | 'EXPENSE';
        amount: number;
      }>;
    }>();

    for (const transaction of transactions) {
      const transactionDate = this.formatDate(transaction.date);
      if (transactionDate < fromKey || transactionDate > toKey) continue;
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const currency = transaction.currency;
      const group = groups.get(currency) ?? {
        income: 0, expenses: 0, byCategory: new Map(),
      };
      const type = transaction.type as 'INCOME' | 'EXPENSE';
      if (type === 'INCOME') group.income += amount;
      else group.expenses += amount;

      const key = `${type}:${transaction.category?.id ?? 'uncategorized'}`;
      const category = group.byCategory.get(key);
      if (category) category.amount += amount;
      else {
        group.byCategory.set(key, {
          categoryId: transaction.category?.id ?? null,
          categoryName: transaction.category?.name ?? 'Uncategorized',
          type,
          amount,
        });
      }
      groups.set(currency, group);
    }

    const byCurrency = Array.from(groups.entries()).map(([currency, group]) => ({
      currency,
      totalIncome: this.money(group.income),
      totalExpenses: this.money(group.expenses),
      netProfit: this.money(group.income - group.expenses),
      byCategory: Array.from(group.byCategory.values())
        .map((entry) => ({ ...entry, amount: this.money(entry.amount) }))
        .sort((left, right) => {
          if (left.type !== right.type) return left.type === 'INCOME' ? -1 : 1;
          return right.amount - left.amount;
        }),
    })).sort((left, right) => left.currency.localeCompare(right.currency));

    // Preserve the original top-level response contract in the business's
    // configured currency. Other currencies remain available in byCurrency.
    const primary = byCurrency.find((group) => group.currency === container.currency) ?? {
      currency: container.currency,
      totalIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      byCategory: [],
    };

    return {
      businessId: container.id,
      currency: container.currency,
      from: fromKey,
      to: toKey,
      totalIncome: primary.totalIncome,
      totalExpenses: primary.totalExpenses,
      netProfit: primary.netProfit,
      byCategory: primary.byCategory,
      byCurrency,
    };
  }

  /**
   * Cash runway in months.
   *
   * runwayMonths = liquid cash / average monthly expenses over the last 90 days.
   * Returns `null` for runwayMonths when there is no expense history (a business
   * with zero burn never runs out, so a number would be misleading).
   */
  async getRunway(userId: string, id: string) {
    const container = await this.getBusinessWithDetails(userId, id);
    this.assertInternal(container, 'Runway');

    const cashByCurrency = new Map<string, number>();
    for (const account of container.accounts) {
      if (
        account.category !== 'ASSET' ||
        !CASH_ACCOUNT_TYPES.includes(account.accountType as string)
      ) continue;
      cashByCurrency.set(
        account.currency,
        (cashByCurrency.get(account.currency) ?? 0) + Number(account.currentBalance),
      );
    }

    const windowDays = 90;
    const to = this.startOfUtcDay(new Date());
    const from = this.addDays(to, -(windowDays - 1));
    const fromKey = this.formatDate(from);
    const toKey = this.formatDate(to);
    const expenses = await this.prisma.transaction.findMany({
      where: {
        userId,
        containerId: container.id,
        type: 'EXPENSE',
        status: { in: ['POSTED', 'RECONCILED'] },
        deletedAt: null,
        date: { gte: this.addDays(from, -1), lte: this.addDays(to, 1) },
      },
      select: { amount: true, date: true, currency: true },
    });

    const expensesByCurrency = new Map<string, number>();
    for (const transaction of expenses) {
      const transactionDate = this.formatDate(transaction.date);
      if (transactionDate < fromKey || transactionDate > toKey) continue;
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      expensesByCurrency.set(
        transaction.currency,
        (expensesByCurrency.get(transaction.currency) ?? 0) + amount,
      );
    }

    const currencies = new Set([...cashByCurrency.keys(), ...expensesByCurrency.keys()]);
    const byCurrency = Array.from(currencies).sort().map((currency) => {
      const cashBalance = cashByCurrency.get(currency) ?? 0;
      const totalExpenses = expensesByCurrency.get(currency) ?? 0;
      const monthlyBurn = totalExpenses / (windowDays / 30);
      const runwayMonths = monthlyBurn > 0 ? Math.max(0, cashBalance) / monthlyBurn : null;
      return {
        currency,
        cashBalance: this.money(cashBalance),
        monthlyBurn: this.money(monthlyBurn),
        runwayMonths: runwayMonths === null ? null : Math.round(runwayMonths * 10) / 10,
      };
    });
    const primary = byCurrency.find((group) => group.currency === container.currency) ?? {
      currency: container.currency,
      cashBalance: 0,
      monthlyBurn: 0,
      runwayMonths: null,
    };

    return {
      businessId: container.id,
      currency: container.currency,
      cashBalance: primary.cashBalance,
      monthlyBurn: primary.monthlyBurn,
      runwayMonths: primary.runwayMonths,
      byCurrency,
      windowDays,
      asOf: toKey,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private async getOwnedBusiness(userId: string, id: string): Promise<BusinessWithProfile> {
    const container = await this.prisma.container.findFirst({
      where: {
        id,
        userId,
        type: { in: ['INTERNAL_BUSINESS', 'EXTERNAL_BUSINESS'] },
        status: 'ACTIVE',
      },
      include: { businessProfile: true },
    });

    if (!container) {
      throw new NotFoundException('Business not found');
    }

    return container;
  }

  private async getBusinessWithDetails(userId: string, id: string): Promise<BusinessWithDetails> {
    const container = await this.prisma.container.findFirst({
      where: {
        id,
        userId,
        type: { in: ['INTERNAL_BUSINESS', 'EXTERNAL_BUSINESS'] },
        status: 'ACTIVE',
      },
      include: businessInclude,
    });

    if (!container) {
      throw new NotFoundException('Business not found');
    }

    return container;
  }

  private assertInternal(container: BusinessWithProfile, feature: string) {
    if (container.type !== 'INTERNAL_BUSINESS') {
      throw new BadRequestException(`${feature} is only available for internal businesses`);
    }
  }

  private toSummary(container: BusinessWithDetails) {
    const isExternal = container.type === 'EXTERNAL_BUSINESS';
    const latestSummary: Summary | null = container.summaries[0] ?? null;

    const netWorth = isExternal
      ? this.netWorthFromSummary(latestSummary)
      : this.calculateNetWorth(container.accounts);

    return {
      id: container.id,
      name: container.name,
      type: container.type,
      currency: container.currency,
      status: container.status,
      createdAt: container.createdAt,
      updatedAt: container.updatedAt,
      businessProfile: container.businessProfile,
      externalSource: container.externalSource,
      accountCount: isExternal ? 0 : container.accounts.length,
      summaryCount: container._count.summaries,
      latestSummary: latestSummary ? serializeSummary(latestSummary) : null,
      netWorth: {
        ...netWorth,
        currency: container.currency,
      },
    };
  }

  private calculateNetWorth(accounts: Account[]): BusinessNetWorth {
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const account of accounts) {
      const balance = Number(account.currentBalance);
      if (account.category === 'ASSET') totalAssets += balance;
      else if (account.category === 'LIABILITY') totalLiabilities += balance;
    }

    return {
      totalAssets: this.money(totalAssets),
      totalLiabilities: this.money(totalLiabilities),
      netWorth: this.money(totalAssets - totalLiabilities),
    };
  }

  private netWorthFromSummary(summary: Summary | null): BusinessNetWorth {
    if (!summary) {
      return { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
    }

    const totalAssets = Number(summary.assetsValue);
    const totalLiabilities = Number(summary.liabilitiesValue);

    return {
      totalAssets: this.money(totalAssets),
      totalLiabilities: this.money(totalLiabilities),
      netWorth: this.money(totalAssets - totalLiabilities),
    };
  }

  /** Rounds to 2 decimal places, avoiding binary floating-point noise. */
  private money(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /** Parses a `YYYY-MM-DD` (or ISO) string as UTC midnight. */
  private parseDateOnly(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
    );
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
