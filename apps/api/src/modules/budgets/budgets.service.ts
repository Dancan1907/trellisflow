// ============================================================================
// Budgets Service
// ============================================================================

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { QueryBudgetsDto } from './dto/query-budgets.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: QueryBudgetsDto) {
    return this.prisma.budget.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(query.containerId ? { containerId: query.containerId } : {}),
        ...(query.period ? { period: query.period } : {}),
      },
      include: {
        container: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId, status: 'ACTIVE' },
      include: {
        container: { select: { name: true } },
      },
    });

    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async create(userId: string, dto: CreateBudgetDto) {
    // 1. Verify container belongs to the user
    const container = await this.prisma.container.findFirst({
      where: { id: dto.containerId, userId },
    });
    if (!container) throw new NotFoundException('Container not found');

    // 2. Verify the category exists (and belongs to the user or is a system category)
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // 3. Check for an existing active budget for this category/container/period
    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        containerId: dto.containerId,
        categoryId: dto.categoryId,
        period: dto.period,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      throw new ConflictException('An active budget for this category and period already exists.');
    }

    // 4. Create the budget
    return this.prisma.budget.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: dto.containerId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        currency: dto.currency,
        period: dto.period,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
        rollover: dto.rollover ?? false,
        method: 'TARGET', // Default to simple target for now
        status: 'ACTIVE',
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    // Verify ownership
    await this.findOne(userId, id);

    return this.prisma.budget.update({
      where: { id },
      data: {
        amount: dto.amount,
        rollover: dto.rollover,
      },
    });
  }

  async remove(userId: string, id: string) {
    // Verify ownership
    await this.findOne(userId, id);

    return this.prisma.budget.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }
}
