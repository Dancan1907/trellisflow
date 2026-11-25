import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiGenerationRequest,
  AiGenerationResult,
  AiProvider,
} from './ai-provider.interface';

interface OpenRouterResponse {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      refusal?: string | null;
    };
  }>;
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

/**
 * OpenRouter adapter using its OpenAI-compatible Chat Completions API.
 * API credentials remain exclusively in the NestJS server environment.
 */
@Injectable()
export class OpenRouterProvider implements AiProvider {
  private readonly logger = new Logger(OpenRouterProvider.name);

  constructor(private readonly config: ConfigService) {}

  async generate(request: AiGenerationRequest): Promise<string> {
    return (await this.generateWithUsage(request)).text;
  }

  async generateWithUsage(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    const configuredModel =
      this.config.get<string>('AI_MODEL') ??
      this.config.get<string>('OPENROUTER_MODEL', 'google/gemma-4-26b-a4b-it:free');
    const timeoutValue = Number(this.config.get<string>('AI_REQUEST_TIMEOUT_MS', '30000'));
    const timeoutMs = Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 30000;

    if (!apiKey || !configuredModel) {
      throw new ServiceUnavailableException(
        'AI provider is not configured. Set OPENROUTER_API_KEY and AI_MODEL.',
      );
    }

    const userContent: Array<Record<string, unknown>> = [
      { type: 'text', text: request.userPrompt },
      ...(request.images ?? []).map((image) => ({
        type: 'image_url',
        image_url: {
          url: `data:${image.mediaType};base64,${image.data}`,
        },
      })),
    ];

    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': this.config.get<string>('APP_URL', 'https://trellisflow.vercel.app'),
          'X-Title': 'TrellisFlow',
        },
        body: JSON.stringify({
          model: configuredModel,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: userContent },
          ],
          max_tokens: request.maxOutputTokens ?? 1200,
          response_format: { type: 'json_object' },
          stream: false,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException('AI provider request timed out.');
      }
      this.logger.warn('OpenRouter request failed before receiving a response.');
      throw new ServiceUnavailableException('AI provider is temporarily unavailable.');
    }

    const payload = (await response.json().catch(() => ({}))) as OpenRouterResponse;
    if (!response.ok) {
      const providerMessage =
        typeof payload.error?.message === 'string'
          ? payload.error.message.replace(/[\r\n\t]+/g, ' ').slice(0, 240)
          : 'No provider error message was returned.';
      this.logger.warn(`OpenRouter returned HTTP ${response.status}: ${providerMessage}`);
      if (response.status === 429) {
        throw new HttpException(
          'The AI provider is busy or its free-tier limit has been reached. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (response.status === 401 || response.status === 402 || response.status === 403) {
        throw new ServiceUnavailableException(
          'The configured AI provider credentials or model access are unavailable.',
        );
      }
      throw new BadGatewayException('AI extraction failed. Please try again.');
    }

    const firstChoice = payload.choices?.[0];
    const messageContent = firstChoice?.message?.content;
    const text =
      typeof messageContent === 'string'
        ? messageContent.trim()
        : Array.isArray(messageContent)
          ? messageContent
              .filter((part) => part.type === 'text' && typeof part.text === 'string')
              .map((part) => part.text)
              .join('\n')
              .trim()
          : '';

    if (!text) {
      const finishReason = firstChoice?.finish_reason ?? 'unknown';
      const refusal = firstChoice?.message?.refusal
        ? ' The provider marked the response as a refusal.'
        : '';
      this.logger.warn(`OpenRouter returned no message text (finish_reason=${finishReason}).`);
      throw new BadGatewayException(
        `AI provider returned no usable text (finish reason: ${finishReason}).${refusal}`,
      );
    }

    return {
      text,
      inputTokens: Number.isSafeInteger(payload.usage?.prompt_tokens)
        ? Math.max(0, payload.usage!.prompt_tokens!)
        : 0,
      outputTokens: Number.isSafeInteger(payload.usage?.completion_tokens)
        ? Math.max(0, payload.usage!.completion_tokens!)
        : 0,
      model: payload.model || configuredModel,
    };
  }
}
