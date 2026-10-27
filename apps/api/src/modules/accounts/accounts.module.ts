import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { SnapshotsModule } from '../snapshots/snapshots.module'; // <--- ADD THIS

@Module({
  imports: [SnapshotsModule], // <--- ADD THIS
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
