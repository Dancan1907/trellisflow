import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AI_PROVIDER } from './ai-provider.interface';
import { AiUsageService } from './ai-usage.service';
import { AnthropicProvider } from './anthropic.provider';
import { OpenRouterProvider } from './openrouter.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    AnthropicProvider,
    OpenRouterProvider,
    AiUsageService,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, AnthropicProvider, OpenRouterProvider],
      useFactory: (
        config: ConfigService,
        anthropic: AnthropicProvider,
        openRouter: OpenRouterProvider,
      ) => {
        const provider = config.get<string>('AI_PROVIDER', 'openrouter');
        if (provider === 'openrouter') return openRouter;
        if (provider === 'anthropic') return anthropic;
        throw new Error(
          `Unsupported AI_PROVIDER "${provider}". Supported providers: "openrouter", "anthropic".`,
        );
      },
    },
  ],
  exports: [AI_PROVIDER, AiUsageService],
})
export class AiModule {}
