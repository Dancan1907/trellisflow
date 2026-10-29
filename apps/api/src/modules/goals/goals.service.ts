// ============================================================================
// Goals Service
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { SavingsGoal } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        container: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(goals.map((g) => this.calculateProgress(userId, g)));
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId, status: 'ACTIVE' },
      include: {
        container: { select: { name: true } },
      },
    });

    if (!goal) throw new NotFoundException('Savings goal not found');

    return this.calculateProgress(userId, goal);
  }

  async create(userId: string, dto: CreateGoalDto) {
    // Verify container belongs to user
    const container = await this.prisma.container.findFirst({
      where: { id: dto.containerId, userId },
    });
    if (!container) throw new NotFoundException('Container not found');

    // Verify account belongs to user (if linked)
    if (dto.linkedAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.linkedAccountId, userId },
      });
      if (!account) throw new NotFoundException('Linked account not found');
    }

    return this.prisma.savingsGoal.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: dto.containerId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        currency: dto.currency,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        linkedAccountId: dto.linkedAccountId,
        notes: dto.notes,
        status: 'ACTIVE',
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.findOne(userId, id);

    return this.prisma.savingsGoal.update({
      where: { id },
      data: {
        name: dto.name,
        targetAmount: dto.targetAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.savingsGoal.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }

  /**
   * Helper: Calculate progress for a goal.
   * If linked to an account, use the account balance.
   * Otherwise, use the manualSavedAmount (not implemented in MVP, so 0 for now).
   */
  private async calculateProgress(userId: string, goal: SavingsGoal & { container?: any }) {
    let currentAmount: number;

    if (goal.linkedAccountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: goal.linkedAccountId },
      });
      currentAmount = account ? Number(account.currentBalance) : 0;
    } else {
      currentAmount = Number(goal.manualSavedAmount || 0);
    }

    const target = Number(goal.targetAmount);
    const remaining = target - currentAmount;
    const percentage = target === 0 ? 0 : Math.round((currentAmount / target) * 100);

    return {
      ...goal,
      currentAmount,
      remaining,
      percentage,
    };
  }
}
