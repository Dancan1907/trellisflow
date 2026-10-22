// ============================================================================
// Transactions Service
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from './balance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private balanceService: BalanceService,
  ) {}

  /**
   * Create a new transaction (income or expense).
   */
  async create(userId: string, dto: CreateTransactionDto) {
    // 1. Verify the account exists and belongs to the user
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId, status: 'ACTIVE' },
    });

    if (!account) {
      throw new NotFoundException('Account not found or inactive');
    }

    // 2. Validate category (must exist and belong to user)
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // 3. Execute in a database transaction
    return this.prisma.$transaction(async (tx) => {
      // a. Create the transaction row
      const transaction = await tx.transaction.create({
        data: {
          id: randomUUID(),
          userId,
          containerId: account.containerId,
          accountId: account.id,
          type: dto.type,
          amount: dto.amount,
          currency: account.currency, // Inherit from account
          date: new Date(dto.date),
          description: dto.description,
          categoryId: dto.categoryId,
          notes: dto.notes,
          source: 'MANUAL',
          status: 'POSTED',
        },
      });

      // b. Update the account balance
      await this.balanceService.applyTransactionEffect(
        tx,
        account.id,
        dto.type,
        dto.amount,
        1, // direction: apply
      );

      // c. (Audit log will be added in a later task)

      return transaction;
    });
  }

  /**
   * List transactions with filters and pagination.
   */
  async findAllForUser(userId: string, query: QueryTransactionsDto) {
    const { limit = 50, cursor, type, accountId, categoryId, dateFrom, dateTo, search } = query;

    // Build the Prisma filter
    const where: any = {
      userId,
      deletedAt: null, // Only show non-deleted
    };

    if (type) where.type = type;
    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Cursor-based pagination
    const queryArgs: any = {
      where,
      take: limit + 1, // Fetch one extra to know if there's a next page
      orderBy: { date: 'desc' },
      include: {
        account: { select: { name: true, currency: true } },
        category: { select: { name: true, icon: true } },
      },
    };

    if (cursor) {
      queryArgs.cursor = { id: cursor };
      queryArgs.skip = 1; // Skip the cursor itself
    }

    const items = await this.prisma.transaction.findMany(queryArgs);

    // Determine if there's a next page
    let nextCursor: string | null = null;
    if (items.length > limit) {
      items.pop(); // Remove the extra item
      nextCursor = items[items.length - 1].id;
    }

    return { items, nextCursor };
  }

  /**
   * Get a single transaction.
   */
  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        account: { select: { name: true, currency: true } },
        category: { select: { name: true, icon: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Update a transaction.
   * Uses balance reversal and re-application to keep things atomic.
   */
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    // Fetch the existing transaction
    const existing = await this.findOne(userId, id);

    // We only allow updating amount, description, category, notes.
    // Type, accountId, and date are immutable for safety.

    return this.prisma.$transaction(async (tx) => {
      // a. If amount changed, reverse the old effect and apply the new one
      if (dto.amount && dto.amount !== Number(existing.amount)) {
        // Reverse old
        await this.balanceService.applyTransactionEffect(
          tx,
          existing.accountId,
          existing.type,
          Number(existing.amount),
          -1, // direction: reverse
        );
        // Apply new
        await this.balanceService.applyTransactionEffect(
          tx,
          existing.accountId,
          existing.type,
          dto.amount,
          1,
        );
      }

      // b. Update the row
      return tx.transaction.update({
        where: { id },
        data: {
          amount: dto.amount,
          description: dto.description,
          categoryId: dto.categoryId,
          notes: dto.notes,
        },
      });
    });
  }

  /**
   * Delete a transaction (soft delete).
   * Reverses the balance effect.
   */
  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      // a. Reverse the balance effect
      await this.balanceService.applyTransactionEffect(
        tx,
        existing.accountId,
        existing.type,
        Number(existing.amount),
        -1, // direction: reverse
      );

      // b. Soft delete
      return tx.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
