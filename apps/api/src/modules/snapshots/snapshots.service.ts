// ============================================================================
// Snapshots Service
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Computes the total net worth for a single user across all 4 containers
   * and saves a snapshot for today's date.
   */
  async computeAndSaveForUser(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight for the unique constraint

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { reportingCurrency: true },
    });
    const reportingCurrency = user?.reportingCurrency ?? 'KES';

    const containers = await this.prisma.container.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        accounts: { where: { status: 'ACTIVE' } },
        summaries: {
          where: { deletedAt: null },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
    });

    type CurrencyTotals = {
      personalNetWorth: number;
      investmentsNetWorth: number;
      businessesNetWorth: number;
    };
    const totalsByCurrency = new Map<string, CurrencyTotals>();
    const getCurrencyTotals = (currency: string): CurrencyTotals => {
      const existing = totalsByCurrency.get(currency);
      if (existing) return existing;
      const created = {
        personalNetWorth: 0,
        investmentsNetWorth: 0,
        businessesNetWorth: 0,
      };
      totalsByCurrency.set(currency, created);
      return created;
    };

    for (const container of containers) {
      if (container.type === 'EXTERNAL_BUSINESS') {
        const latest = container.summaries[0];
        if (latest) {
          const group = getCurrencyTotals(latest.currency);
          group.businessesNetWorth += Number(latest.assetsValue) - Number(latest.liabilitiesValue);
        }
        continue;
      }

      for (const account of container.accounts) {
        const group = getCurrencyTotals(account.currency);
        const balance = Number(account.currentBalance);
        const netEffect = account.category === 'ASSET' ? balance : -balance;

        if (container.type === 'PERSONAL') group.personalNetWorth += netEffect;
        else if (container.type === 'INVESTMENT') group.investmentsNetWorth += netEffect;
        else if (container.type === 'INTERNAL_BUSINESS') group.businessesNetWorth += netEffect;
      }
    }

    const byCurrency = Array.from(totalsByCurrency.entries())
      .map(([currency, totals]) => ({
        currency,
        personalNetWorth: totals.personalNetWorth,
        investmentsNetWorth: totals.investmentsNetWorth,
        businessesNetWorth: totals.businessesNetWorth,
        totalNetWorth:
          totals.personalNetWorth + totals.investmentsNetWorth + totals.businessesNetWorth,
      }))
      .sort((left, right) => left.currency.localeCompare(right.currency));

    // The snapshot headline is always expressed in the user's reporting
    // currency. Other currencies remain visible in the JSON breakdown; no FX
    // conversion or cross-currency addition is attempted.
    const reportingTotals = totalsByCurrency.get(reportingCurrency) ?? {
      personalNetWorth: 0,
      investmentsNetWorth: 0,
      businessesNetWorth: 0,
    };
    const personalNetWorth = reportingTotals.personalNetWorth;
    const investmentsNetWorth = reportingTotals.investmentsNetWorth;
    const businessesNetWorth = reportingTotals.businessesNetWorth;
    const totalNetWorth = personalNetWorth + investmentsNetWorth + businessesNetWorth;
    const breakdown = {
      byCurrency,
      currencyHandling: 'Each currency is calculated independently. The snapshot headline contains only the user reporting currency; no FX conversion is applied.',
    };

    const snapshot = await this.prisma.netWorthSnapshot.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      create: {
        id: randomUUID(),
        userId,
        date: today,
        totalNetWorth,
        personalNetWorth,
        investmentsNetWorth,
        businessesNetWorth,
        breakdown,
        currency: reportingCurrency,
      },
      update: {
        totalNetWorth,
        personalNetWorth,
        investmentsNetWorth,
        businessesNetWorth,
        breakdown,
        currency: reportingCurrency,
        computedAt: new Date(),
      },
    });

    this.logger.log(
      `Snapshot saved for user ${userId}: ${reportingCurrency} ${totalNetWorth}`,
    );
    return snapshot;
  }

  /**
   * Runs the snapshot for ALL active users.
   * This is what the daily cron job will call.
   */
  async computeForAllUsers() {
    // Note: In production, we would paginate this to avoid loading millions of users.
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    let processed = 0;
    for (const user of users) {
      try {
        await this.computeAndSaveForUser(user.id);
        processed++;
      } catch (error) {
        this.logger.error(`Failed to snapshot user ${user.id}`, error);
      }
    }
    return { processed, total: users.length };
  }
}
