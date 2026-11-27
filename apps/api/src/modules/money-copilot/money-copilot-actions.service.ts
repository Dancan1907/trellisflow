import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from '../transactions/balance.service';
import { AuditLogService } from '../../common/services/audit.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { PreviewMoneyCopilotActionDto } from './dto/preview-money-copilot-action.dto';

type ActionPayload = {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  accountId: string;
  categoryId?: string;
  date: string;
  description: string;
  notes?: string;
};

@Injectable()
export class MoneyCopilotActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: BalanceService,
    private readonly audit: AuditLogService,
    private readonly snapshots: SnapshotsService,
  ) {}

  async preview(userId: string, dto: PreviewMoneyCopilotActionDto) {
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
      ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
      date: dto.date.slice(0, 10),
      description: dto.description.trim(),
      ...(dto.notes?.trim() ? { notes: dto.notes.trim() } : {}),
    };
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
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
        currency: account.currency,
        account: account.name,
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
    const existing = await this.prisma.moneyCopilotAction.findFirst({
      where: { id: actionId, userId },
    });
    if (!existing) throw new NotFoundException('Action preview not found.');
    if (existing.status === 'CONFIRMED' && existing.transactionId) {
      const transaction = await this.prisma.transaction.findFirst({
        where: { id: existing.transactionId, userId },
      });
      if (!transaction) throw new ConflictException('The confirmed transaction could not be retrieved.');
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
    const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    if (digest !== existing.payloadHash) throw new ConflictException('The action preview has changed. Create a new preview.');

    try {
      const transaction = await this.prisma.$transaction(async (tx) => {
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

      await this.snapshots.computeAndSaveForUser(userId);
      return { status: 'CONFIRMED' as const, transaction, replayed: false };
    } catch (error) {
      // A concurrent retry may have won the atomic claim. Return its result,
      // but never execute the financial mutation a second time.
      const latest = await this.prisma.moneyCopilotAction.findFirst({ where: { id: actionId, userId } });
      if (latest?.status === 'CONFIRMED' && latest.transactionId) {
        const transaction = await this.prisma.transaction.findFirst({
          where: { id: latest.transactionId, userId },
        });
        if (transaction) return { status: 'CONFIRMED' as const, transaction, replayed: true };
      }
      throw error;
    }
  }
}
