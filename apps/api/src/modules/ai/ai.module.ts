import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from './ai-provider.interface';
import { AnthropicProvider } from './anthropic.provider';

@Module({
  providers: [
    AnthropicProvider,
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
  exports: [AI_PROVIDER],
})
export class AiModule {}
