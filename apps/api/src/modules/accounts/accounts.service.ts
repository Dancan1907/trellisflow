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
    const accounts = await this.prisma.account.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    let assets = 0;
    let liabilities = 0;

    for (const acc of accounts) {
      if (acc.category === 'ASSET') {
        assets += Number(acc.currentBalance);
      } else if (acc.category === 'LIABILITY') {
        liabilities += Number(acc.currentBalance);
      }
    }

    return {
      totalNetWorth: assets - liabilities,
      totalAssets: assets,
      totalLiabilities: liabilities,
    };
  }
}
