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
}
