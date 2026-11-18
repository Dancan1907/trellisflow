import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { QueryPnlDto } from './dto/query-pnl.dto';
import { randomUUID } from 'crypto';
import { DEFAULT_BUSINESS_CATEGORIES } from '../../common/constants/default-business-categories';
import { Account, BusinessProfile, BusinessType, Container } from '@prisma/client';

type BusinessWithProfile = Container & { businessProfile: BusinessProfile | null };
type BusinessWithDetails = BusinessWithProfile & { accounts: Account[] };

/** Account types that count as liquid cash for runway purposes. */
const CASH_ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CASH', 'MOBILE_MONEY', 'PREPAID_CARD'];

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
              type: 'INTERNAL_BUSINESS',
              name: dto.name,
              currency: dto.currency.toUpperCase(),
              status: 'ACTIVE',
            },
          });

          // 2. Create the business profile
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

          // 3. Create ALL categories in ONE query (fixes the 500 timeout error)
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
            categoriesCreated: DEFAULT_BUSINESS_CATEGORIES.length,
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
      where: { userId, type: 'INTERNAL_BUSINESS', status: 'ACTIVE' },
      include: {
        businessProfile: true,
        accounts: { where: { status: 'ACTIVE' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return containers.map((container) => this.toSummary(container));
  }

  async findOne(userId: string, id: string) {
    const container = await this.getBusinessWithAccounts(userId, id);

    return {
      ...this.toSummary(container),
      accounts: container.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        category: account.category,
        accountType: account.accountType,
        currency: account.currency,
        currentBalance: this.money(Number(account.currentBalance)),
        institution: account.institution,
        status: account.status,
      })),
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
  // Analytics — net worth, P&L, runway
  // ==========================================================================

  async getNetWorth(userId: string, id: string) {
    const container = await this.getBusinessWithAccounts(userId, id);

    return {
      businessId: container.id,
      currency: container.currency,
      ...this.calculateNetWorth(container.accounts),
    };
  }

  /**
   * Profit & Loss for a date range (defaults to the last 30 days, inclusive).
   * Only INCOME and EXPENSE transactions are counted — transfers are excluded,
   * because moving money between the business's own accounts is not profit.
   */
  async getPnl(userId: string, id: string, query: QueryPnlDto = {}) {
    const container = await this.getOwnedBusiness(userId, id);

    const to = query.to ? this.parseDateOnly(query.to) : this.startOfUtcDay(new Date());
    const from = query.from ? this.parseDateOnly(query.from) : this.addDays(to, -29);

    if (from > to) {
      throw new BadRequestException('`from` must be on or before `to`');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        containerId: container.id,
        type: { in: ['INCOME', 'EXPENSE'] },
        deletedAt: null,
        date: { gte: from, lte: to },
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    const byCategory = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string;
        type: 'INCOME' | 'EXPENSE';
        amount: number;
      }
    >();

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      const type = transaction.type as 'INCOME' | 'EXPENSE';

      if (type === 'INCOME') totalIncome += amount;
      else totalExpenses += amount;

      const key = `${type}:${transaction.category?.id ?? 'uncategorized'}`;
      const existing = byCategory.get(key);

      if (existing) {
        existing.amount += amount;
      } else {
        byCategory.set(key, {
          categoryId: transaction.category?.id ?? null,
          categoryName: transaction.category?.name ?? 'Uncategorized',
          type,
          amount,
        });
      }
    }

    return {
      businessId: container.id,
      currency: container.currency,
      from: this.formatDate(from),
      to: this.formatDate(to),
      totalIncome: this.money(totalIncome),
      totalExpenses: this.money(totalExpenses),
      netProfit: this.money(totalIncome - totalExpenses),
      byCategory: Array.from(byCategory.values())
        .map((entry) => ({ ...entry, amount: this.money(entry.amount) }))
        .sort((a, b) => {
          // INCOME before EXPENSE, then largest amount first.
          if (a.type !== b.type) return a.type === 'INCOME' ? -1 : 1;
          return b.amount - a.amount;
        }),
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
    const container = await this.getBusinessWithAccounts(userId, id);

    const cashBalance = container.accounts
      .filter(
        (account) =>
          account.category === 'ASSET' &&
          CASH_ACCOUNT_TYPES.includes(account.accountType as string),
      )
      .reduce((sum, account) => sum + Number(account.currentBalance), 0);

    const windowDays = 90;
    const to = this.startOfUtcDay(new Date());
    const from = this.addDays(to, -(windowDays - 1));

    const expenses = await this.prisma.transaction.findMany({
      where: {
        userId,
        containerId: container.id,
        type: 'EXPENSE',
        deletedAt: null,
        date: { gte: from, lte: to },
      },
      select: { amount: true },
    });

    const totalExpenses = expenses.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
    );
    const monthlyBurn = totalExpenses / (windowDays / 30);
    const runwayMonths = monthlyBurn > 0 ? cashBalance / monthlyBurn : null;

    return {
      businessId: container.id,
      currency: container.currency,
      cashBalance: this.money(cashBalance),
      monthlyBurn: this.money(monthlyBurn),
      runwayMonths: runwayMonths === null ? null : Math.round(runwayMonths * 10) / 10,
      windowDays,
      asOf: this.formatDate(to),
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private async getOwnedBusiness(userId: string, id: string): Promise<BusinessWithProfile> {
    const container = await this.prisma.container.findFirst({
      where: { id, userId, type: 'INTERNAL_BUSINESS', status: 'ACTIVE' },
      include: { businessProfile: true },
    });

    if (!container) {
      throw new NotFoundException('Business not found');
    }

    return container;
  }

  private async getBusinessWithAccounts(userId: string, id: string): Promise<BusinessWithDetails> {
    const container = await this.prisma.container.findFirst({
      where: { id, userId, type: 'INTERNAL_BUSINESS', status: 'ACTIVE' },
      include: {
        businessProfile: true,
        accounts: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!container) {
      throw new NotFoundException('Business not found');
    }

    return container;
  }

  private toSummary(container: BusinessWithProfile & { accounts: Account[] }) {
    return {
      id: container.id,
      name: container.name,
      type: container.type,
      currency: container.currency,
      status: container.status,
      createdAt: container.createdAt,
      updatedAt: container.updatedAt,
      businessProfile: container.businessProfile,
      accountCount: container.accounts.length,
      netWorth: {
        ...this.calculateNetWorth(container.accounts),
        currency: container.currency,
      },
    };
  }

  private calculateNetWorth(accounts: Account[]) {
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
