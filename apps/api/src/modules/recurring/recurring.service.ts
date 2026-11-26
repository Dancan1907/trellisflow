// ============================================================================
// Recurring Service
// ============================================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecurringRuleDto } from './dto/create-recurring-rule.dto';
import { UpdateRecurringRuleDto } from './dto/update-recurring-rule.dto';
import { QueryUpcomingDto } from './dto/query-upcoming.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class RecurringService {
  constructor(private prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.recurringRule.findMany({
      where: { userId, status: { not: 'DELETED' } },
      include: {
        account: { select: { name: true, currency: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const rule = await this.prisma.recurringRule.findFirst({
      where: { id, userId, status: { not: 'DELETED' } },
    });
    if (!rule) throw new NotFoundException('Recurring rule not found');
    return rule;
  }

  async create(userId: string, dto: CreateRecurringRuleDto) {
    // Verify the account belongs to the user
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId, status: 'ACTIVE' },
    });
    if (!account) throw new NotFoundException('Account not found');

    // Transfers require a distinct destination in the same container and currency.
    if (dto.type === 'TRANSFER') {
      if (!dto.transferToAccountId) {
        throw new BadRequestException('A destination account is required for recurring transfers');
      }
      const toAccount = await this.prisma.account.findFirst({
        where: { id: dto.transferToAccountId, userId, status: 'ACTIVE' },
      });
      if (!toAccount) throw new NotFoundException('Destination account not found');
      if (toAccount.id === account.id) {
        throw new BadRequestException('Cannot transfer to the same account');
      }
      if (toAccount.containerId !== account.containerId) {
        throw new BadRequestException('Recurring transfers must be within the same container');
      }
      if (toAccount.currency !== account.currency) {
        throw new BadRequestException('Recurring transfers must use the same currency');
      }
    }

    return this.prisma.recurringRule.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: account.containerId,
        accountId: dto.accountId,
        type: dto.type,
        amount: dto.amount,
        currency: account.currency,
        categoryId: dto.categoryId,
        transferToAccountId: dto.transferToAccountId,
        description: dto.description,
        frequency: dto.frequency,
        interval: dto.interval ?? 1,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextOccurrence: new Date(dto.startDate),
        status: 'ACTIVE',
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateRecurringRuleDto) {
    await this.findOne(userId, id);
    return this.prisma.recurringRule.update({
      where: { id },
      data: {
        amount: dto.amount,
        categoryId: dto.categoryId,
        description: dto.description,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async pause(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.recurringRule.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async resume(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.recurringRule.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.recurringRule.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  /**
   * Get upcoming occurrences within the next X days.
   */
  async getUpcoming(userId: string, query: QueryUpcomingDto) {
    const days = query.days ?? 30;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.prisma.recurringRule.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        nextOccurrence: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        account: { select: { name: true, currency: true } },
      },
      orderBy: { nextOccurrence: 'asc' },
    });
  }

  /**
   * Helper: Calculate the next occurrence date based on frequency.
   */
  calculateNextOccurrence(
    currentDate: Date,
    frequency: string,
    interval: number,
    dayOfMonth?: number | null,
    dayOfWeek?: number | null,
  ): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case 'DAILY':
        next.setUTCDate(next.getUTCDate() + interval);
        break;
      case 'WEEKLY':
      case 'BIWEEKLY': {
        const days = (frequency === 'WEEKLY' ? 7 : 14) * interval;
        next.setUTCDate(next.getUTCDate() + days);
        if (dayOfWeek != null) {
          const adjustment = (dayOfWeek - next.getUTCDay() + 7) % 7;
          next.setUTCDate(next.getUTCDate() + adjustment);
        }
        break;
      }
      case 'MONTHLY':
      case 'QUARTERLY':
      case 'YEARLY': {
        const months = frequency === 'MONTHLY'
          ? interval
          : frequency === 'QUARTERLY' ? 3 * interval : 12 * interval;
        const targetMonth = next.getUTCMonth() + months;
        const targetYear = next.getUTCFullYear() + Math.floor(targetMonth / 12);
        const normalizedMonth = ((targetMonth % 12) + 12) % 12;
        const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
        const intendedDay = dayOfMonth ?? next.getUTCDate();
        return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(intendedDay, lastDay)));
      }
      default:
        // Preserve the existing fallback behavior for unknown frequencies.
        next.setUTCDate(next.getUTCDate() + interval);
    }

    return next;
  }

  /**
   * Generate transactions for all rules due today or earlier.
   * This is called by the cron job.
   */
  async generateDueTransactions() {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Process anything due up to end of today

    // Find all active rules that are due
    const dueRules = await this.prisma.recurringRule.findMany({
      where: {
        status: 'ACTIVE',
        nextOccurrence: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      include: {
        account: true,
      },
    });

    let processed = 0;
    let failed = 0;

    for (const rule of dueRules) {
      try {
        // Execute in a DB transaction to ensure atomicity
        await this.prisma.$transaction(async (tx) => {
          // 1. Generate the transaction(s) and apply their balance effects atomically.
          if (rule.type === 'TRANSFER') {
            if (!rule.transferToAccountId) {
              throw new Error('Recurring transfer has no destination account');
            }
            const destination = await tx.account.findFirst({
              where: {
                id: rule.transferToAccountId,
                userId: rule.userId,
                status: 'ACTIVE',
              },
            });
            if (!destination) throw new Error('Recurring transfer destination is missing or inactive');
            if (
              destination.id === rule.accountId ||
              destination.containerId !== rule.containerId ||
              destination.currency !== rule.currency
            ) {
              throw new Error('Recurring transfer destination must be a different account in the same container and currency');
            }

            const pairId = randomUUID();
            await tx.transaction.create({
              data: {
                id: randomUUID(),
                userId: rule.userId,
                containerId: rule.containerId,
                accountId: rule.accountId,
                type: 'TRANSFER',
                amount: `-${rule.amount.toString()}`,
                currency: rule.currency,
                date: rule.nextOccurrence,
                description: rule.description,
                transferPairId: pairId,
                source: 'RECURRING',
                recurringRuleId: rule.id,
                status: 'POSTED',
              },
            });
            await tx.transaction.create({
              data: {
                id: randomUUID(),
                userId: rule.userId,
                containerId: destination.containerId,
                accountId: destination.id,
                type: 'TRANSFER',
                amount: rule.amount,
                currency: destination.currency,
                date: rule.nextOccurrence,
                description: rule.description,
                transferPairId: pairId,
                source: 'RECURRING',
                recurringRuleId: rule.id,
                status: 'POSTED',
              },
            });
            await tx.account.update({
              where: { id: rule.accountId },
              data: { currentBalance: { decrement: rule.amount } },
            });
            await tx.account.update({
              where: { id: destination.id },
              data: { currentBalance: { increment: rule.amount } },
            });
          } else {
            await tx.transaction.create({
              data: {
                id: randomUUID(),
                userId: rule.userId,
                containerId: rule.containerId,
                accountId: rule.accountId,
                type: rule.type,
                amount: rule.amount,
                currency: rule.currency,
                date: rule.nextOccurrence,
                description: rule.description,
                categoryId: rule.categoryId,
                source: 'RECURRING',
                recurringRuleId: rule.id,
                status: 'POSTED',
              },
            });

            const delta = rule.type === 'INCOME' ? Number(rule.amount) : -Number(rule.amount);
            await tx.account.update({
              where: { id: rule.accountId },
              data: { currentBalance: { increment: delta } },
            });
          }

          // 3. Calculate the NEXT occurrence
          const nextDate = this.calculateNextOccurrence(
            rule.nextOccurrence,
            rule.frequency,
            rule.interval,
            rule.dayOfMonth ?? rule.startDate.getUTCDate(),
            rule.dayOfWeek,
          );

          // 4. Update the rule
          await tx.recurringRule.update({
            where: { id: rule.id },
            data: {
              lastGeneratedAt: rule.nextOccurrence,
              nextOccurrence: nextDate,
            },
          });
        });

        processed++;
      } catch (error) {
        // Log the error and increment the failed counter so it doesn't masquerade as success
        console.error(`Failed to process rule ${rule.id}:`, error);
        failed++;
      }
    }

    return { processed, failed, total: dueRules.length };
  }
}
