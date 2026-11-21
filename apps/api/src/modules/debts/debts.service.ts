import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDebtPlanDto } from './dto/create-debt-plan.dto';
import { SimulateDebtDto } from './dto/simulate-debt.dto';
import { randomUUID } from 'crypto';
import { DebtMethod } from '@prisma/client';

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.debtPayoffPlan.findMany({
      where: { userId, status: 'ACTIVE', account: { status: 'ACTIVE' } },
      include: {
        account: { select: { id: true, name: true, currentBalance: true, currency: true } },
      },
    });
  }

  async create(userId: string, dto: CreateDebtPlanDto) {
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId, category: 'LIABILITY', status: 'ACTIVE' },
    });

    if (!account) {
      throw new NotFoundException('Liability account not found or is not a debt.');
    }

    const existing = await this.prisma.debtPayoffPlan.findUnique({
      where: { accountId: dto.accountId },
    });
    if (existing) {
      throw new BadRequestException('A debt plan already exists for this account.');
    }

    return this.prisma.debtPayoffPlan.create({
      data: {
        id: randomUUID(),
        userId,
        accountId: dto.accountId,
        method: dto.method ?? 'SNOWBALL',
        extraMonthlyPayment: 0,
        minimumPayment: dto.minimumPayment,
        interestRate: dto.interestRate,
        notes: dto.notes,
      },
    });
  }

  async simulate(userId: string, dto: SimulateDebtDto) {
    const plans = await this.prisma.debtPayoffPlan.findMany({
      where: { userId, status: 'ACTIVE', account: { status: 'ACTIVE' } },
      include: { account: true },
    });

    if (plans.length === 0) {
      throw new BadRequestException('No active debts found to simulate.');
    }

    // Map to a mutable working structure
    const debts = plans.map((p) => ({
      id: p.id,
      name: p.account.name,
      balance: Number(p.account.currentBalance),
      minimumPayment: Number(p.minimumPayment),
      interestRate: Number(p.interestRate) / 100 / 12, // Monthly rate
    }));

    // Sort based on method
    if (dto.method === 'SNOWBALL') {
      debts.sort((a, b) => a.balance - b.balance);
    } else {
      debts.sort((a, b) => b.interestRate - a.interestRate); // Avalanche
    }

    const extra = dto.extraMonthlyPayment;
    let totalInterestPaid = 0;
    let month = 0;
    const MAX_MONTHS = 600; // 50 year safety limit
    const history: Array<{ month: number; totalBalance: number }> = [];

    while (debts.some((d) => d.balance > 0) && month < MAX_MONTHS) {
      month++;
      let currentExtra = extra;
      let totalBalanceThisMonth = 0;

      for (const debt of debts) {
        if (debt.balance <= 0) continue;

        // 1. Apply interest
        const interest = debt.balance * debt.interestRate;
        debt.balance += interest;
        totalInterestPaid += interest;

        // 2. Apply minimum payment
        const payment = Math.min(debt.balance, debt.minimumPayment);
        debt.balance -= payment;

        // 3. Apply extra payment (Snowball/Avalanche target)
        if (currentExtra > 0 && debt.balance > 0) {
          const extraPayment = Math.min(debt.balance, currentExtra);
          debt.balance -= extraPayment;
          currentExtra -= extraPayment;
        }

        totalBalanceThisMonth += debt.balance;
      }

      history.push({ month, totalBalance: Math.round(totalBalanceThisMonth * 100) / 100 });
    }

    return {
      monthsToPayoff: month,
      payoffDate: new Date(new Date().setMonth(new Date().getMonth() + month))
        .toISOString()
        .slice(0, 10),
      totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
      monthlyExtra: extra,
      method: dto.method,
      history, // For charting
    };
  }

  async remove(userId: string, id: string) {
    const plan = await this.prisma.debtPayoffPlan.findFirst({ where: { id, userId } });
    if (!plan) throw new NotFoundException('Debt plan not found');

    return this.prisma.debtPayoffPlan.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }
}
