import { Module } from '@nestjs/common';
import { SummariesService } from './summaries.service';
import { BusinessSummariesController } from './business-summaries.controller';
import { SummariesController } from './summaries.controller';
import { SnapshotsModule } from '../snapshots/snapshots.module';

@Module({
  imports: [SnapshotsModule],
  controllers: [BusinessSummariesController, SummariesController],
  providers: [SummariesService],
  exports: [SummariesService],
})
export class SummariesModule {}
