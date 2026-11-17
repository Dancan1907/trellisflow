import { Module } from '@nestjs/common';
import { InvestmentEventsService } from './investment-events.service';
import { InvestmentEventsController } from './investment-events.controller';

@Module({
  controllers: [InvestmentEventsController],
  providers: [InvestmentEventsService],
  exports: [InvestmentEventsService],
})
export class InvestmentEventsModule {}
