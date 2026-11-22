import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PricingService } from './pricing.service';

@Injectable()
export class PricingCron {
  private readonly logger = new Logger(PricingCron.name);
  private running = false;

  constructor(private pricingService: PricingService) {}

  // Every 30 minutes by default; override with PRICE_REFRESH_CRON env var.
  // @nestjs/schedule supports custom envs via the decorator argument.
  @Cron(process.env.PRICE_REFRESH_CRON ?? '*/30 * * * *')
  async handleRefresh() {
    if (this.running) {
      this.logger.warn('Skipping refresh — previous run still in progress');
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
