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

    // 1. Fetch all active containers for this user
    const containers = await this.prisma.container.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        accounts: { where: { status: 'ACTIVE' } },
        summaries: {
          orderBy: { date: 'desc' },
          take: 1, // Get the latest summary for external businesses
        },
      },
    });

    let personalNetWorth = 0;
    let investmentsNetWorth = 0;
    let businessesNetWorth = 0;

    // 2. Iterate through containers and calculate
    for (const container of containers) {
      let containerTotal = 0;

      if (container.type === 'EXTERNAL_BUSINESS') {
        // External businesses use their latest summary
        const latest = container.summaries[0];
        if (latest) {
          containerTotal = Number(latest.assetsValue) - Number(latest.liabilitiesValue);
        }
      } else {
        // Internal containers use accounts
        for (const account of container.accounts) {
          const balance = Number(account.currentBalance);
          if (account.category === 'ASSET') {
            containerTotal += balance;
          } else if (account.category === 'LIABILITY') {
            containerTotal -= balance;
          }
        }
      }

      // 3. Add to the correct bucket
      if (container.type === 'PERSONAL') {
        personalNetWorth += containerTotal;
      } else if (container.type === 'INVESTMENT') {
        investmentsNetWorth += containerTotal;
      } else if (container.type === 'INTERNAL_BUSINESS' || container.type === 'EXTERNAL_BUSINESS') {
        businessesNetWorth += containerTotal;
      }
    }

    const totalNetWorth = personalNetWorth + investmentsNetWorth + businessesNetWorth;

    // 4. Upsert the snapshot (so running it twice on the same day just updates it)
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
        breakdown: {}, // JSONB breakdown (can be expanded later)
        currency: 'KES', // Hardcoded for now, should be the user's reporting currency
      },
      update: {
        totalNetWorth,
        personalNetWorth,
        investmentsNetWorth,
        businessesNetWorth,
        computedAt: new Date(),
      },
    });

    this.logger.log(`Snapshot saved for user ${userId}: Total ${totalNetWorth}`);
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
