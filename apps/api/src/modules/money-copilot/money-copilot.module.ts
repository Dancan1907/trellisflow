import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { MoneyCopilotController } from './money-copilot.controller';
import { MoneyCopilotDataService } from './money-copilot-data.service';
import { MoneyCopilotService } from './money-copilot.service';
import { MoneyCopilotActionsService } from './money-copilot-actions.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';

@Module({
  imports: [AiModule, BusinessesModule, TransactionsModule, SnapshotsModule],
  controllers: [MoneyCopilotController],
  providers: [MoneyCopilotService, MoneyCopilotDataService, MoneyCopilotActionsService],
})
export class MoneyCopilotModule {}
