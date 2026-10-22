// ============================================================================
// Recurring Service
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
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

    // If it's a transfer, verify the destination account
    if (dto.type === 'TRANSFER' && dto.transferToAccountId) {
      const toAccount = await this.prisma.account.findFirst({
        where: { id: dto.transferToAccountId, userId, status: 'ACTIVE' },
      });
      if (!toAccount) throw new NotFoundException('Destination account not found');
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
  calculateNextOccurrence(currentDate: Date, frequency: string, interval: number): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + interval);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7 * interval);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14 * interval);
        break;
      case 'MONTHLY': {
        // Handle end-of-month gracefully (e.g. Jan 31 + 1 month = Feb 28)
        const targetMonth = next.getMonth() + interval;
        const originalDay = next.getDate();
        next.setMonth(targetMonth);
        // If the month overflowed (e.g. Feb 31 -> Mar 3), set to last day of the target month
        if (next.getDate() !== originalDay) {
          next.setDate(0); // Sets to the last day of the previous month
        }
        break;
      }
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3 * interval);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + interval);
        break;
      default:
        // Fallback to daily if unknown
        next.setDate(next.getDate() + interval);
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

    for (const rule of dueRules) {
      try {
        // Execute in a DB transaction to ensure atomicity
        await this.prisma.$transaction(async (tx) => {
          // 1. Generate the transaction
          if (rule.type === 'TRANSFER' && rule.transferToAccountId) {
            // For now, we skip transfers in the generator (will add later)
            return;
          }

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

          // 2. Update the balance
          let delta = 0;
          if (rule.type === 'INCOME') delta = Number(rule.amount);
          if (rule.type === 'EXPENSE') delta = -Number(rule.amount);

          await tx.account.update({
            where: { id: rule.accountId },
            data: { currentBalance: { increment: delta } },
          });

          // 3. Calculate the NEXT occurrence
          const nextDate = this.calculateNextOccurrence(
            rule.nextOccurrence,
            rule.frequency,
            rule.interval,
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
        // Log the error but continue processing other rules
        console.error(`Failed to process rule ${rule.id}:`, error);
      }
    }

    return { processed, total: dueRules.length };
  }
}
