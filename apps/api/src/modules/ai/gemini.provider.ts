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

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string; status?: string; code?: number };
}

/**
 * Google Gemini Developer API adapter.
 *
 * Uses the REST generateContent endpoint and keeps the API key exclusively
 * in the NestJS server environment. OpenRouter remains independently selectable.
 */
@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly config: ConfigService) {}

  async generate(request: AiGenerationRequest): Promise<string> {
    return (await this.generateWithUsage(request)).text;
  }

  async generateWithUsage(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    const configuredModel = this.config.get<string>(
      'GEMINI_MODEL',
      'gemini-3.5-flash-lite',
    );
    const timeoutValue = Number(this.config.get<string>('AI_REQUEST_TIMEOUT_MS', '30000'));
    const timeoutMs =
      Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 30000;

    if (!apiKey || !configuredModel) {
      throw new ServiceUnavailableException(
        'AI provider is not configured. Set GEMINI_API_KEY and GEMINI_MODEL.',
      );
    }

    const parts: Array<Record<string, unknown>> = [
      { text: request.userPrompt },
      ...(request.images ?? []).map((image) => ({
        inlineData: {
          mimeType: image.mediaType,
          data: image.data,
        },
      })),
    ];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(configuredModel)}:generateContent`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: request.systemPrompt }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: request.maxOutputTokens ?? 1200,
        responseMimeType: 'application/json',
      },
    });

    let response: Response | undefined;
    let lastNetworkError: unknown;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok || (response.status !== 429 && response.status < 500)) break;
        if (attempt < maxAttempts) {
          this.logger.warn(`Gemini temporarily returned HTTP ${response.status}; retrying attempt ${attempt + 1}/${maxAttempts}.`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 350));
        }
      } catch (error) {
        lastNetworkError = error;
        if (attempt === maxAttempts) break;
        this.logger.warn(`Gemini request failed on attempt ${attempt}; retrying.`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 350));
      }
    }

    if (!response) {
      if (lastNetworkError instanceof Error && lastNetworkError.name === 'TimeoutError') {
        throw new GatewayTimeoutException('AI provider request timed out after retries.');
      }
      this.logger.warn('Gemini request failed before receiving a response after retries.');
      throw new ServiceUnavailableException('AI provider is temporarily unavailable. Please try again.');
    }

    const payload = (await response.json().catch(() => ({}))) as GeminiResponse;
    if (!response.ok) {
      const providerStatus =
        typeof payload.error?.status === 'string' ? payload.error.status : 'unknown';
      const providerCode = Number.isSafeInteger(payload.error?.code)
        ? payload.error!.code
        : 'unknown';
      const providerMessage =
        typeof payload.error?.message === 'string'
          ? payload.error.message.replace(/[\r\n\t]+/g, ' ').slice(0, 240)
          : 'No provider error message was returned.';
      this.logger.warn(
        `Gemini returned HTTP ${response.status} (provider status: ${providerStatus}, code: ${providerCode}): ${providerMessage}`,
      );
      if (response.status === 429) {
        throw new HttpException(
          'The AI provider is busy or its usage limit has been reached. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (/API key not valid|invalid API key|API_KEY_INVALID/i.test(providerMessage)) {
        throw new ServiceUnavailableException(
          'The configured Gemini API key is invalid. Check GEMINI_API_KEY in the backend environment.',
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new ServiceUnavailableException(
          'The configured Gemini API credentials or model access are unavailable.',
        );
      }
      throw new BadGatewayException('AI extraction failed. Please try again.');
    }

    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts
      ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (!text) {
      const finishReason = candidate?.finishReason ?? 'unknown';
      this.logger.warn(`Gemini returned no message text (finishReason=${finishReason}).`);
      throw new BadGatewayException(
        `AI provider returned no usable text (finish reason: ${finishReason}).`,
      );
    }

    return {
      text,
      inputTokens: Number.isSafeInteger(payload.usageMetadata?.promptTokenCount)
        ? Math.max(0, payload.usageMetadata!.promptTokenCount!)
        : 0,
      outputTokens: Number.isSafeInteger(payload.usageMetadata?.candidatesTokenCount)
        ? Math.max(0, payload.usageMetadata!.candidatesTokenCount!)
        : 0,
      model: payload.modelVersion || configuredModel,
    };
  }
}
