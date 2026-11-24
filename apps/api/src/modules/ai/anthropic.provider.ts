import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiGenerationRequest, AiProvider } from './ai-provider.interface';

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

/**
 * Anthropic Messages API adapter.
 *
 * Uses Node's built-in fetch so the API package does not need a vendor SDK
 * dependency. The rest of the application only sees the AiProvider contract.
 */
@Injectable()
export class AnthropicProvider implements AiProvider {
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private readonly config: ConfigService) {}

  async generate(request: AiGenerationRequest): Promise<string> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    const model = this.config.get<string>('ANTHROPIC_MODEL');
    const timeoutMs = Number(this.config.get<string>('AI_REQUEST_TIMEOUT_MS', '20000'));

    if (!apiKey || !model) {
      throw new ServiceUnavailableException(
        'AI provider is not configured. Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL.',
      );
    }

    const content = [
      ...(request.images ?? []).map((image) => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.mediaType,
          data: image.data,
        },
      })),
      { type: 'text', text: request.userPrompt },
    ];

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: request.maxOutputTokens ?? 1200,
          system: request.systemPrompt,
          messages: [{ role: 'user', content }],
        }),
        signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 20000),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException('AI provider request timed out.');
      }
      this.logger.warn('Anthropic provider request failed before receiving a response.');
      throw new ServiceUnavailableException('AI provider is temporarily unavailable.');
    }

    const payload = (await response.json().catch(() => ({}))) as AnthropicMessageResponse;

    if (!response.ok) {
      this.logger.warn(`Anthropic provider returned HTTP ${response.status}.`);
      throw new BadGatewayException('AI extraction failed. Please try again.');
    }

    const text = payload.content
      ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new BadGatewayException('AI provider returned an empty response.');
    }

    return text;
  }
}
