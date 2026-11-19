import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SummariesService } from './summaries.service';

@Injectable()
export class StaleSummaryJob implements OnModuleInit {
  private readonly logger = new Logger(StaleSummaryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly summariesService: SummariesService,
  ) {}

  onModuleInit() {
    this.logger.log('Stale Summary background job initialized (Runs every 24h).');

    // Run the job every 24 hours (86,400,000 ms)
    setInterval(
      () => {
        this.handleStaleSummaries();
      },
      24 * 60 * 60 * 1000,
    );
  }

  async handleStaleSummaries() {
    this.logger.log('Starting daily stale-summary detection job...');

    try {
      const users = await this.prisma.container.findMany({
        where: { type: 'EXTERNAL_BUSINESS', status: 'ACTIVE' },
        select: { userId: true },
        distinct: ['userId'],
      });

      if (users.length === 0) return;

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
