import { Module } from '@nestjs/common';
import { SummariesService } from './summaries.service';
import { BusinessSummariesController } from './business-summaries.controller';
import { SummariesController } from './summaries.controller';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { StaleSummaryJob } from './stale-summary.job';

@Module({
  imports: [SnapshotsModule],
  controllers: [BusinessSummariesController, SummariesController],
  providers: [SummariesService, StaleSummaryJob],
  exports: [SummariesService],
})
export class SummariesModule {}
