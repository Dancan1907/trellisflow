import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AI_PROVIDER } from './ai-provider.interface';
import { AiUsageService } from './ai-usage.service';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { OpenRouterProvider } from './openrouter.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    AnthropicProvider,
    GeminiProvider,
    OpenRouterProvider,
    AiUsageService,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, AnthropicProvider, GeminiProvider, OpenRouterProvider],
      useFactory: (
        config: ConfigService,
        anthropic: AnthropicProvider,
        gemini: GeminiProvider,
        openRouter: OpenRouterProvider,
      ) => {
        const provider = config.get<string>('AI_PROVIDER', 'gemini');
        if (provider === 'gemini') return gemini;
        if (provider === 'openrouter') return openRouter;
        if (provider === 'anthropic') return anthropic;
        throw new Error(
          `Unsupported AI_PROVIDER "${provider}". Supported providers: "gemini", "openrouter", "anthropic".`,
        );
      },
    },
  ],
  exports: [AI_PROVIDER, AiUsageService],
})
export class AiModule {}
