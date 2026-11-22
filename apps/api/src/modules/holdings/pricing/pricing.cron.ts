import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PricingService } from './pricing.service';

@Injectable()
export class PricingCron {
  private readonly logger = new Logger(PricingCron.name);
  private running = false;

  constructor(private pricingService: PricingService) {}

  // Runs every 30 minutes. The decorator is evaluated at module load, so we
  // don't read env vars here — the scheduler module itself has no per-cron
  // override mechanism. To change the interval, edit this decorator directly.
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleRefresh() {
    if (this.running) {
      this.logger.warn('Skipping pricing refresh — previous run still in progress');
      return;
    }
    this.running = true;
    try {
      const result = await this.pricingService.refreshAll();
      this.logger.log(
        `Pricing cron: ${result.succeeded}/${result.processed} updated, ${result.failed} failed`,
      );
    } catch (err) {
      this.logger.error('Pricing cron failed', err as Error);
    } finally {
      this.running = false;
    }
  }
}
