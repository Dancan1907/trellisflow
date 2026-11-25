import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { BalanceService } from './balance.service';
import { SnapshotsModule } from '../snapshots/snapshots.module';

@Module({
  imports: [SnapshotsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, BalanceService],
  exports: [BalanceService, TransactionsService], // Shared transaction workflows
})
export class TransactionsModule {}
