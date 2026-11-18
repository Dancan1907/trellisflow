import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SummariesService } from './summaries.service';

@Injectable()
export class StaleSummaryJob {
  private readonly logger = new Logger(StaleSummaryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly summariesService: SummariesService,
  ) {}

  // Runs every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleStaleSummaries() {
    this.logger.log('Starting daily stale-summary detection job...');

    try {
      // Find all unique users who have at least one active external business
      const users = await this.prisma.container.findMany({
        where: { type: 'EXTERNAL_BUSINESS', status: 'ACTIVE' },
        select: { userId: true },
        distinct: ['userId'],
      });

      if (users.length === 0) {
        this.logger.log('No active external businesses found. Skipping job.');
        return;
      }

      let totalCreated = 0;

      for (const { userId } of users) {
        const result = await this.summariesService.processStale(userId);
        totalCreated += result.created;
      }

      this.logger.log(
        `Stale-summary job completed. Checked ${users.length} users. Created ${totalCreated} new insights.`,
      );
    } catch (error) {
      this.logger.error('Error running stale-summary job', error);
    }
  }
}
