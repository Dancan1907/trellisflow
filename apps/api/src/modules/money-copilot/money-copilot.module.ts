import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { MoneyCopilotController } from './money-copilot.controller';
import { MoneyCopilotDataService } from './money-copilot-data.service';
import { MoneyCopilotService } from './money-copilot.service';

@Module({
  imports: [AiModule, BusinessesModule],
  controllers: [MoneyCopilotController],
  providers: [MoneyCopilotService, MoneyCopilotDataService],
})
export class MoneyCopilotModule {}
