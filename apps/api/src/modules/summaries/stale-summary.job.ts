import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SummariesService } from './summaries.service';

@Injectable()
export class StaleSummaryJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StaleSummaryJob.name);
  private timer: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly summariesService: SummariesService,
  ) {}

  onModuleInit() {
    this.logger.log('Stale Summary background job initialized (Runs every 24h).');

    // Save the timer so we can clear it later
    this.timer = setInterval(
      () => {
        this.handleStaleSummaries();
      },
      24 * 60 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    // Clear the timer when the application shuts down
    if (this.timer) {
      clearInterval(this.timer);
    }
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
