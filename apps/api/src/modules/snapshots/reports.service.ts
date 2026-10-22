import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 1. Net Worth Trend (for the dashboard chart)
   */
  async getNetWorthTrend(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.netWorthSnapshot.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        totalNetWorth: true,
        personalNetWorth: true,
        investmentsNetWorth: true,
        businessesNetWorth: true,
      },
    });
  }

  /**
   * 2. Cash Flow Report (Income vs Expenses for a date range)
   */
  async getCashFlow(userId: string, dateFrom: Date, dateTo: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: dateFrom, lte: dateTo },
        deletedAt: null,
      },
    });

    let income = 0;
    let expenses = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') income += Number(tx.amount);
      if (tx.type === 'EXPENSE') expenses += Number(tx.amount);
    }

    return {
      period: { from: dateFrom, to: dateTo },
      income,
      expenses,
      net: income - expenses,
    };
  }

  /**
   * 3. Allocation Report (Breakdown by Container)
   */
  async getAllocation(userId: string) {
    // Get latest snapshot to see breakdown
    const latest = await this.prisma.netWorthSnapshot.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    if (!latest) {
      return { message: 'No snapshots found yet.' };
    }

    return {
      total: latest.totalNetWorth,
      breakdown: {
        personal: latest.personalNetWorth,
        investments: latest.investmentsNetWorth,
        businesses: latest.businessesNetWorth,
      },
    };
  }
}
