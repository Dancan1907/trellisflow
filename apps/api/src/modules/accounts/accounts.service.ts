// ============================================================================
// Accounts Service
// ============================================================================

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private snapshotsService: SnapshotsService,
  ) {}

  /**
   * List all active accounts for the user.
   */
  async findAllForUser(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get a single account by ID.
   */
  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, status: { not: 'DELETED' } },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  /**
   * Create a new account.
   */
  async create(userId: string, dto: CreateAccountDto) {
    // Verify the container belongs to the user
    const container = await this.prisma.container.findFirst({
      where: { id: dto.containerId, userId },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    // Create it
    const account = await this.prisma.account.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: dto.containerId,
        name: dto.name,
        category: dto.category,
        accountType: dto.accountType,
        currency: dto.currency,
        currentBalance: dto.initialBalance ?? 0,
        institution: dto.institution,
        status: 'ACTIVE',
      },
    });

    // Recompute snapshot so reports update instantly
    await this.snapshotsService.computeAndSaveForUser(userId);

    return account;
  }

  /**
   * Update an account (name, institution).
   */
  async update(userId: string, id: string, dto: UpdateAccountDto) {
    // Verify ownership
    await this.findOne(userId, id);

    const account = await this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name,
        institution: dto.institution,
      },
    });

    // Recompute snapshot so reports update instantly
    await this.snapshotsService.computeAndSaveForUser(userId);

    return account;
  }

  /**
   * Archive an account (soft delete).
   */
  async archive(userId: string, id: string) {
    const account = await this.findOne(userId, id);

    // Prevent archiving an account with transactions
    const transactionCount = await this.prisma.transaction.count({
      where: { accountId: id, deletedAt: null },
    });

    if (transactionCount > 0) {
      throw new ConflictException('Cannot archive an account with transactions');
    }

    const archived = await this.prisma.account.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });

    // Recompute snapshot so reports update instantly
    await this.snapshotsService.computeAndSaveForUser(userId);

    return archived;
  }

  /**
   * Calculate net worth for a user.
   * Assets - Liabilities = Net Worth.
   */
  async getNetWorth(userId: string) {
    const [user, accounts] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { reportingCurrency: true },
      }),
      this.prisma.account.findMany({
        where: { userId, status: 'ACTIVE' },
      }),
    ]);
    const reportingCurrency = user?.reportingCurrency ?? 'KES';
    const groups = new Map<string, { assets: number; liabilities: number }>();

    for (const account of accounts) {
      const group = groups.get(account.currency) ?? { assets: 0, liabilities: 0 };
      const balance = Number(account.currentBalance);
      if (account.category === 'ASSET') group.assets += balance;
      else if (account.category === 'LIABILITY') group.liabilities += balance;
      groups.set(account.currency, group);
    }

    const byCurrency = Array.from(groups.entries()).map(([currency, group]) => ({
      currency,
      totalAssets: group.assets,
      totalLiabilities: group.liabilities,
      totalNetWorth: group.assets - group.liabilities,
    })).sort((left, right) => left.currency.localeCompare(right.currency));
    const primary = byCurrency.find((group) => group.currency === reportingCurrency) ?? {
      currency: reportingCurrency,
      totalAssets: 0,
      totalLiabilities: 0,
      totalNetWorth: 0,
    };

    return {
      currency: reportingCurrency,
      totalNetWorth: primary.totalNetWorth,
      totalAssets: primary.totalAssets,
      totalLiabilities: primary.totalLiabilities,
      byCurrency,
    };
  }
}
