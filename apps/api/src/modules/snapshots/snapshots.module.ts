import { Module } from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { SnapshotsController } from './snapshots.controller';
import { ReportsService } from './reports.service';

@Module({
  providers: [SnapshotsService],
  controllers: [SnapshotsController],
  exports: [ReportsService],
})
export class SnapshotsModule {}
