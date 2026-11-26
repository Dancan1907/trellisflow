import { Module } from '@nestjs/common';
import { CashFlowForecastingController } from './cash-flow-forecasting.controller';
import { CashFlowForecastingService } from './cash-flow-forecasting.service';

@Module({
  controllers: [CashFlowForecastingController],
  providers: [CashFlowForecastingService],
})
export class CashFlowForecastingModule {}
