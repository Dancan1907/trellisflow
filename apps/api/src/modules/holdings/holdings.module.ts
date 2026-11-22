import { Module } from '@nestjs/common';
import { HoldingsService } from './holdings.service';
import { HoldingsController } from './holdings.controller';
import { PricingService } from './pricing/pricing.service';
import { PricingCron } from './pricing/pricing.cron';
import { AlphaVantageProvider } from './pricing/alpha-vantage.provider';
import { FinnhubProvider } from './pricing/finnhub.provider';
import { CoinGeckoProvider } from './pricing/coingecko.provider';

@Module({
  controllers: [HoldingsController],
  providers: [
    HoldingsService,
    PricingService,
    PricingCron,
    AlphaVantageProvider,
    FinnhubProvider,
    CoinGeckoProvider,
  ],
  exports: [HoldingsService, PricingService],
})
export class HoldingsModule {}
