import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { GoalsModule } from '../goals/goals.module';

@Module({
  providers: [InsightsService],
  controllers: [InsightsController],
  imports: [GoalsModule],
})
export class InsightsModule {}
