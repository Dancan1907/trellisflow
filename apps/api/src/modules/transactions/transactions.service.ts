// ============================================================================
// Transactions Service
// ============================================================================

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from './balance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { AuditLogService } from '../../common/services/audit.service';
import { AuditAction, TransactionSource } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SnapshotsService } from '../snapshots/snapshots.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private balanceService: BalanceService,
    private auditLog: AuditLogService,
    private snapshotsService: SnapshotsService,
  ) {}

  /**
   * Create a new transaction (income or expense).
   */
  async create(
    userId: string,
    dto: CreateTransactionDto,
    source: TransactionSource = 'MANUAL',
  ) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.transaction.findFirst({
        where: { userId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.resolveIdempotentTransaction(existing, dto);
    }

    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId, status: 'ACTIVE' },
    });
    if (!account) throw new NotFoundException('Account not found or inactive');

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    let transaction;
    try {
      transaction = await this.prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            id: randomUUID(), userId, containerId: account.containerId,
            accountId: account.id, type: dto.type, amount: dto.amount,
            currency: account.currency, date: new Date(dto.date),
            description: dto.description, categoryId: dto.categoryId,
            notes: dto.notes, mpesaReference: dto.mpesaReference?.trim().toUpperCase(),
            receiptImageHash: dto.receiptImageHash, idempotencyKey: dto.idempotencyKey,
            source, status: 'POSTED',
          },
        });
        await this.balanceService.applyTransactionEffect(tx, account.id, dto.type, dto.amount, 1);
        await this.auditLog.log(tx, userId, 'Transaction', created.id, AuditAction.CREATE, null, created);
        return created;
      });
    } catch (error) {
      if (dto.idempotencyKey && this.isUniqueConstraintViolation(error)) {
        const existing = await this.prisma.transaction.findFirst({
          where: { userId, idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return this.resolveIdempotentTransaction(existing, dto);
      }
      throw error;
    }

    await this.snapshotsService.computeAndSaveForUser(userId);
    return transaction;
  }

  /**
   * List transactions with filters and pagination.
   */
  async findAllForUser(userId: string, query: QueryTransactionsDto) {
    const {
      limit = 50,
      cursor,
      type,
      accountId,
      containerId,
      categoryId,
      dateFrom,
      dateTo,
      search,
    } = query;

    // Build the Prisma filter
    const where: any = {
      userId,
      deletedAt: null, // Only show non-deleted
    };

    if (type) where.type = type;
    if (accountId) where.accountId = accountId;
    if (containerId) where.containerId = containerId;
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
      nextCursor = items[items.length - 1]!.id; // <--- Added '!'
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
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          amount: dto.amount,
          description: dto.description,
          categoryId: dto.categoryId,
          notes: dto.notes,
        },
      });

      // c. Write the audit log
      await this.auditLog.log(
        tx,
        userId,
        'Transaction',
        id,
        AuditAction.UPDATE,
        existing, // The 'before' state
        updated, // The 'after' state
      );

      return updated;
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
      const deleted = await tx.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // c. Write the audit log
      await this.auditLog.log(
        tx,
        userId,
        'Transaction',
        id,
        AuditAction.DELETE,
        existing, // The 'before' state
        deleted, // The 'after' state
      );

      return deleted;
    });
  }

  /**
   * Create a transfer between two accounts.
   *
   * Rules:
   * 1. Both accounts must belong to the user.
   * 2. Both accounts must belong to the SAME container.
   * 3. Two transactions are created, linked by transfer_pair_id.
   * 4. Both happen inside a single DB transaction.
   */
  async transfer(userId: string, dto: CreateTransferDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.transaction.findFirst({
        where: { userId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.resolveIdempotentTransfer(existing, dto, userId);
    }

    const fromAccount = await this.prisma.account.findFirst({
      where: { id: dto.fromAccountId, userId, status: 'ACTIVE' },
    });
    const toAccount = await this.prisma.account.findFirst({
      where: { id: dto.toAccountId, userId, status: 'ACTIVE' },
    });
    if (!fromAccount) throw new NotFoundException('Source account not found');
    if (!toAccount) throw new NotFoundException('Destination account not found');
    if (fromAccount.id === toAccount.id) throw new BadRequestException('Cannot transfer to the same account');
    if (fromAccount.containerId !== toAccount.containerId) {
      throw new BadRequestException('Transfers must be within the same container');
    }
    if (fromAccount.currency !== toAccount.currency) {
      throw new BadRequestException('Transfers must be between accounts of the same currency');
    }

    if (dto.mpesaReference || dto.receiptImageHash) {
      if (dto.mpesaReference && dto.mpesaReferenceAccountId !== fromAccount.id && dto.mpesaReferenceAccountId !== toAccount.id) {
        throw new BadRequestException('The M-Pesa reference must be attached to one of the selected transfer accounts.');
      }
      const existingReference = await this.prisma.transaction.findFirst({
        where: {
          userId,
          OR: [
            ...(dto.mpesaReference ? [{ mpesaReference: dto.mpesaReference.trim().toUpperCase() }] : []),
            ...(dto.receiptImageHash ? [{ receiptImageHash: dto.receiptImageHash }] : []),
          ],
        },
        select: { id: true },
      });
      if (existingReference) throw new ConflictException('This M-Pesa reference has already been imported.');
    }

    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const pairId = randomUUID();
        const outTx = await tx.transaction.create({
          data: {
            id: randomUUID(), userId, containerId: fromAccount.containerId,
            accountId: fromAccount.id, type: 'TRANSFER', amount: -dto.amount,
            currency: fromAccount.currency, date: new Date(dto.date),
            description: dto.description, notes: dto.notes, transferPairId: pairId,
            idempotencyKey: dto.idempotencyKey,
            mpesaReference: dto.mpesaReference && dto.mpesaReferenceAccountId === fromAccount.id
              ? dto.mpesaReference.trim().toUpperCase() : undefined,
            receiptImageHash: dto.receiptImageHash && dto.mpesaReferenceAccountId === fromAccount.id
              ? dto.receiptImageHash : undefined,
            source: dto.mpesaReference ? 'IMPORTED' : 'MANUAL', status: 'POSTED',
          },
        });
        const inTx = await tx.transaction.create({
          data: {
            id: randomUUID(), userId, containerId: toAccount.containerId,
            accountId: toAccount.id, type: 'TRANSFER', amount: dto.amount,
            currency: toAccount.currency, date: new Date(dto.date),
            description: dto.description, notes: dto.notes, transferPairId: pairId,
            mpesaReference: dto.mpesaReference && dto.mpesaReferenceAccountId === toAccount.id
              ? dto.mpesaReference.trim().toUpperCase() : undefined,
            receiptImageHash: dto.receiptImageHash && dto.mpesaReferenceAccountId === toAccount.id
              ? dto.receiptImageHash : undefined,
            source: dto.mpesaReference ? 'IMPORTED' : 'MANUAL', status: 'POSTED',
          },
        });
        await this.balanceService.applyTransactionEffect(tx, fromAccount.id, 'TRANSFER', -dto.amount, 1);
        await this.balanceService.applyTransactionEffect(tx, toAccount.id, 'TRANSFER', dto.amount, 1);
        return { outTx, inTx };
      });
    } catch (error) {
      if (dto.idempotencyKey && this.isUniqueConstraintViolation(error)) {
        const existing = await this.prisma.transaction.findFirst({
          where: { userId, idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return this.resolveIdempotentTransfer(existing, dto, userId);
      }
      throw error;
    }

    await this.snapshotsService.computeAndSaveForUser(userId);
    return result;
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return !!error && typeof error === 'object' && 'code' in error &&
      (error as { code?: string }).code === 'P2002';
  }

  private resolveIdempotentTransaction(existing: any, dto: CreateTransactionDto) {
    const existingDate = existing.date instanceof Date
      ? existing.date.toISOString().slice(0, 10) : String(existing.date).slice(0, 10);
    const samePayload = existing.type === dto.type && existing.accountId === dto.accountId &&
      Number(existing.amount) === dto.amount && existingDate === dto.date.slice(0, 10) &&
      existing.description === dto.description &&
      (existing.categoryId ?? null) === (dto.categoryId ?? null) &&
      (existing.notes ?? null) === (dto.notes ?? null);
    if (!samePayload) throw new ConflictException('This idempotency key has already been used for a different transaction.');
    return existing;
  }

  private async resolveIdempotentTransfer(existing: any, dto: CreateTransferDto, userId: string) {
    if (existing.type !== 'TRANSFER' || !existing.transferPairId) {
      throw new ConflictException('This idempotency key has already been used for a different transaction.');
    }
    const pair = await this.prisma.transaction.findMany({
      where: { userId, transferPairId: existing.transferPairId },
    });
    const outTx = pair.find((item: any) => item.accountId === dto.fromAccountId && Number(item.amount) === -dto.amount);
    const inTx = pair.find((item: any) => item.accountId === dto.toAccountId && Number(item.amount) === dto.amount);
    const sameCommonFields = pair.length === 2 && pair.every((item: any) => {
      const itemDate = item.date instanceof Date ? item.date.toISOString().slice(0, 10) : String(item.date).slice(0, 10);
      return item.type === 'TRANSFER' && itemDate === dto.date.slice(0, 10) &&
        item.description === dto.description && (item.notes ?? null) === (dto.notes ?? null);
    });
    if (!outTx || !inTx || !sameCommonFields) {
      throw new ConflictException('This idempotency key has already been used for a different transfer.');
    }
    return { outTx, inTx };
  }

}
