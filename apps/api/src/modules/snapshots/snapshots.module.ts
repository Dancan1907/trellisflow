import { Module } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsController } from './snapshots.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [SnapshotsController],
  providers: [SnapshotsService, ReportsService],
})
export class SnapshotsModule {}
