import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NaturalLanguageDraftsController } from './natural-language-drafts.controller';
import { NaturalLanguageDraftsService } from './natural-language-drafts.service';

@Module({
  imports: [AiModule, AccountsModule, CategoriesModule, TransactionsModule],
  controllers: [NaturalLanguageDraftsController],
  providers: [NaturalLanguageDraftsService],
})
export class NaturalLanguageDraftsModule {}
