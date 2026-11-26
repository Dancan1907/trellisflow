import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { InsightNarrationService } from './insight-narration.service';
import { GoalsModule } from '../goals/goals.module';
import { AiModule } from '../ai/ai.module';

@Module({
  providers: [InsightsService, InsightNarrationService],
  controllers: [InsightsController],
  imports: [GoalsModule, AiModule],
})
export class InsightsModule {}
