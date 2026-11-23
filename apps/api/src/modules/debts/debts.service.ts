import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDebtPlanDto } from './dto/create-debt-plan.dto';
import { SimulateDebtDto } from './dto/simulate-debt.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.debtPayoffPlan.findMany({
      where: { userId, status: 'ACTIVE', account: { status: 'ACTIVE' } },
      include: {
        account: {
          select: { id: true, name: true, currentBalance: true, currency: true },
        },
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

    const debts = plans.map((p) => ({
      id: p.id,
      name: p.account.name,
      balance: Number(p.account.currentBalance),
      minimumPayment: Number(p.minimumPayment),
      interestRate: Number(p.interestRate) / 100 / 12,
      paidOff: false,
    }));

    const extra = dto.extraMonthlyPayment;
    let totalInterestPaid = 0;
    let month = 0;
    const MAX_MONTHS = 600;
    const history: Array<{ month: number; totalBalance: number }> = [];
    // CRITICAL: Tracks minimums freed when a debt is paid off.
    // Snowball/avalanche strategies roll these into the extra pool.
    let freedUpMinPayments = 0;

    while (debts.some((d) => d.balance > 0) && month < MAX_MONTHS) {
      month++;

      // Re-sort each month: paid-off debts sink to the bottom, then by strategy
      debts.sort((a, b) => {
        if (a.balance <= 0 && b.balance > 0) return 1;
        if (a.balance > 0 && b.balance <= 0) return -1;
        if (a.balance <= 0 && b.balance <= 0) return 0;
        if (dto.method === 'SNOWBALL') return a.balance - b.balance;
        return b.interestRate - a.interestRate;
      });

      // Compute extra pool ONCE per month — captures freed minimums from prior months
      let remainingExtra = extra + freedUpMinPayments;
      let totalBalanceThisMonth = 0;

      for (const debt of debts) {
        if (debt.balance <= 0) continue;

        // 1. Interest
        const interest = debt.balance * debt.interestRate;
        debt.balance += interest;
        totalInterestPaid += interest;

        // 2. Minimum payment
        const minPayment = Math.min(debt.balance, debt.minimumPayment);
        debt.balance -= minPayment;

        // 3. Extra (target debt only)
        if (remainingExtra > 0 && debt.balance > 0) {
          const extraPayment = Math.min(debt.balance, remainingExtra);
          debt.balance -= extraPayment;
          remainingExtra -= extraPayment;
        }

        // 4. Detect payoff — roll the freed minimum into next month's pool
        if (debt.balance <= 0 && !debt.paidOff) {
          debt.balance = 0;
          debt.paidOff = true;
          freedUpMinPayments += debt.minimumPayment;
        }

        totalBalanceThisMonth += debt.balance;
      }

      history.push({
        month,
        totalBalance: Math.round(totalBalanceThisMonth * 100) / 100,
      });
    }

    return {
      monthsToPayoff: month,
      payoffDate: new Date(new Date().setMonth(new Date().getMonth() + month))
        .toISOString()
        .slice(0, 10),
      totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
      monthlyExtra: extra,
      method: dto.method,
      history,
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
