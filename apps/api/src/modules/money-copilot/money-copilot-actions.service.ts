import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BalanceService } from '../transactions/balance.service';
import { AuditLogService } from '../../common/services/audit.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { PreviewMoneyCopilotActionDto } from './dto/preview-money-copilot-action.dto';

type ActionPayload = {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  accountId: string;
  accountName: string;
  currency: string;
  categoryId?: string;
  categoryName: string | null;
  date: string;
  description: string;
  notes?: string;
};

function serializeActionPayload(payload: ActionPayload): string {
  // JSONB may reorder object keys on round-trip; hash a fixed canonical shape.
  return JSON.stringify({
    type: payload.type,
    amount: payload.amount,
    accountId: payload.accountId,
    accountName: payload.accountName,
    currency: payload.currency,
    categoryId: payload.categoryId ?? null,
    categoryName: payload.categoryName,
    date: payload.date,
    description: payload.description,
    notes: payload.notes ?? null,
  });
}

@Injectable()
export class MoneyCopilotActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: BalanceService,
    private readonly audit: AuditLogService,
    private readonly snapshots: SnapshotsService,
    private readonly config: ConfigService,
  ) {}

  private assertEnabled(): void {
    if (this.config.get<string>('AI_MONEY_COPILOT_ENABLED', 'false') !== 'true') {
      throw new ForbiddenException('Money Copilot actions are not enabled yet.');
    }
  }

  async preview(userId: string, dto: PreviewMoneyCopilotActionDto) {
    this.assertEnabled();
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, name: true, currency: true, containerId: true },
    });
    if (!account) throw new NotFoundException('Active account not found.');

    let categoryName: string | null = null;
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          userId,
          status: 'ACTIVE',
          deletedAt: null,
          type: dto.type,
          OR: [{ containerId: account.containerId }, { containerId: null }],
        },
        select: { id: true, name: true },
      });
      if (!category) throw new BadRequestException('The selected category is not available for this account and transaction type.');
      categoryName = category.name;
    }

    const payload: ActionPayload = {
      type: dto.type,
      amount: Number(dto.amount),
      accountId: dto.accountId,
      accountName: account.name,
      currency: account.currency,
      ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      categoryName,
      date: dto.date.slice(0, 10),
      description: dto.description.trim(),
      ...(dto.notes?.trim() ? { notes: dto.notes.trim() } : {}),
    };
    const payloadHash = createHash('sha256').update(serializeActionPayload(payload)).digest('hex');
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.moneyCopilotAction.create({
      data: {
        id,
        userId,
        idempotencyKey: id,
        payloadHash,
        payload: payload as any,
        expiresAt,
      },
    });

    return {
      actionId: id,
      status: 'PENDING' as const,
      expiresAt: expiresAt.toISOString(),
      preview: {
        type: payload.type,
        amount: payload.amount,
        currency: payload.currency,
        account: payload.accountName,
        accountId: account.id,
        categoryId: payload.categoryId ?? null,
        category: categoryName,
        date: payload.date,
        description: payload.description,
        notes: payload.notes ?? null,
      },
      requiresExplicitConfirmation: true as const,
    };
  }

  async confirm(userId: string, actionId: string) {
    this.assertEnabled();
    const existing = await this.prisma.moneyCopilotAction.findFirst({
      where: { id: actionId, userId },
    });
    if (!existing) throw new NotFoundException('Action preview not found.');
    if (existing.status === 'CONFIRMED' && existing.transactionId) {
      const transaction = await this.prisma.transaction.findFirst({
        where: { id: existing.transactionId, userId },
      });
      if (!transaction) throw new ConflictException('The confirmed transaction could not be retrieved.');
      // A prior request may have committed the transaction but failed to refresh
      // the snapshot. Retry the refresh without repeating the financial write.
      await this.snapshots.computeAndSaveForUser(userId);
      return { status: 'CONFIRMED' as const, transaction, replayed: true };
    }
    if (existing.status !== 'PENDING' || existing.expiresAt <= new Date()) {
      if (existing.status === 'PENDING') {
        await this.prisma.moneyCopilotAction.updateMany({
          where: { id: actionId, userId, status: 'PENDING', expiresAt: { lte: new Date() } },
          data: { status: 'EXPIRED' },
        });
      }
      throw new GoneException('This preview has expired or is no longer available. Create a new preview.');
    }

    const payload = existing.payload as unknown as ActionPayload;
    const digest = createHash('sha256').update(serializeActionPayload(payload)).digest('hex');
    if (digest !== existing.payloadHash) throw new ConflictException('The action preview has changed. Create a new preview.');

    let transaction;
    try {
      transaction = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.moneyCopilotAction.updateMany({
          where: {
            id: actionId,
            userId,
            status: 'PENDING',
            expiresAt: { gt: new Date() },
            payloadHash: digest,
          },
          data: { status: 'CONFIRMED', confirmedAt: new Date() },
        });
        if (claimed.count !== 1) throw new ConflictException('This action has already been confirmed or has expired.');

        const account = await tx.account.findFirst({
          where: { id: payload.accountId, userId, status: 'ACTIVE', deletedAt: null },
        });
        if (!account) throw new NotFoundException('The selected account is no longer active.');
        if (account.name !== payload.accountName || account.currency !== payload.currency) {
          throw new ConflictException('The account details changed after preview. Create a new preview.');
        }

        if (payload.categoryId) {
          const category = await tx.category.findFirst({
            where: {
              id: payload.categoryId,
              userId,
              status: 'ACTIVE',
              deletedAt: null,
              type: payload.type,
              OR: [{ containerId: account.containerId }, { containerId: null }],
            },
          });
          if (!category) throw new BadRequestException('The selected category is no longer available.');
          if (category.name !== payload.categoryName) throw new ConflictException('The category changed after preview. Create a new preview.');
        }

        const created = await tx.transaction.create({
          data: {
            id: randomUUID(),
            userId,
            containerId: account.containerId,
            accountId: account.id,
            type: payload.type,
            amount: payload.amount,
            currency: account.currency,
            date: new Date(payload.date),
            description: payload.description,
            categoryId: payload.categoryId,
            notes: payload.notes,
            source: 'MANUAL',
            status: 'POSTED',
            idempotencyKey: existing.idempotencyKey,
          },
        });

        await this.balances.applyTransactionEffect(tx, account.id, payload.type, payload.amount, 1);
        await this.audit.log(tx, userId, 'Transaction', created.id, AuditAction.CREATE, null, created);
        await tx.moneyCopilotAction.update({
          where: { id: actionId },
          data: { transactionId: created.id },
        });
        return created;
      });
    } catch (error) {
      // A concurrent retry may have won the atomic claim. Return its result,
      // but never execute the financial mutation a second time.
      const latest = await this.prisma.moneyCopilotAction.findFirst({ where: { id: actionId, userId } });
      if (latest?.status === 'CONFIRMED' && latest.transactionId) {
        const confirmedTransaction = await this.prisma.transaction.findFirst({
          where: { id: latest.transactionId, userId },
        });
        if (confirmedTransaction) {
          await this.snapshots.computeAndSaveForUser(userId);
          return { status: 'CONFIRMED' as const, transaction: confirmedTransaction, replayed: true };
        }
      }
      throw error;
    }

    // Surface snapshot failures. A retry will refresh the snapshot above
    // while returning the already committed transaction without posting again.
    await this.snapshots.computeAndSaveForUser(userId);
    return { status: 'CONFIRMED' as const, transaction, replayed: false };
  }
}