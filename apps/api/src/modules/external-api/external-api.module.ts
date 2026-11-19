import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { SummariesModule } from '../summaries/summaries.module';

@Module({
  imports: [ApiTokensModule, SummariesModule],
  controllers: [ExternalApiController],
})
export class ExternalApiModule {}
