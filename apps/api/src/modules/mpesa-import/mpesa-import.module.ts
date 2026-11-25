import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { MpesaImportController } from './mpesa-import.controller';
import { MpesaImportService } from './mpesa-import.service';

@Module({
  imports: [AiModule, TransactionsModule],
  controllers: [MpesaImportController],
  providers: [MpesaImportService],
})
export class MpesaImportModule {}
