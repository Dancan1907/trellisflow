import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { SummariesModule } from '../summaries/summaries.module';
import { IdempotencyService } from './idempotency/idempotency.service';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';

@Module({
  imports: [ApiTokensModule, SummariesModule],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, IdempotencyService, IdempotencyInterceptor],
})
export class ExternalApiModule {}
