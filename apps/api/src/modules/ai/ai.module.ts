import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AI_PROVIDER } from './ai-provider.interface';
import { AiUsageService } from './ai-usage.service';
import { AnthropicProvider } from './anthropic.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    AnthropicProvider,
    AiUsageService,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, AnthropicProvider],
      useFactory: (config: ConfigService, anthropic: AnthropicProvider) => {
        const provider = config.get<string>('AI_PROVIDER', 'anthropic');
        if (provider !== 'anthropic') {
          throw new Error(
            `Unsupported AI_PROVIDER "${provider}". Only "anthropic" is configured.`,
          );
        }
        return anthropic;
      },
    },
  ],
  exports: [AI_PROVIDER, AiUsageService],
})
export class AiModule {}
