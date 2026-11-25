import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';

describe('GeminiProvider', () => {
  const originalFetch = global.fetch;
  let config: { get: jest.Mock };
  let provider: GeminiProvider;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          GEMINI_API_KEY: 'test-gemini-key',
          GEMINI_MODEL: 'gemini-3.5-flash-lite',
          AI_REQUEST_TIMEOUT_MS: '30000',
        };
        return values[key] ?? fallback;
      }),
    };
    provider = new GeminiProvider(config as unknown as ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sends text, receipt images, and JSON response configuration to Gemini', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        modelVersion: 'gemini-3.5-flash-lite',
        candidates: [{ content: { parts: [{ text: '{"type":"EXPENSE"}' }] } }],
        usageMetadata: { promptTokenCount: 140, candidatesTokenCount: 35 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      provider.generateWithUsage({
        systemPrompt: 'Extract transaction facts',
        userPrompt: 'Read this receipt',
        images: [{ mediaType: 'image/png', data: 'aGVsbG8=' }],
      }),
    ).resolves.toEqual({
      text: '{"type":"EXPENSE"}',
      inputTokens: 140,
      outputTokens: 35,
      model: 'gemini-3.5-flash-lite',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-goog-api-key': 'test-gemini-key',
        }),
      }),
    );
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.contents[0].parts[1]).toEqual({
      inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' },
    });
    expect(JSON.stringify(body)).not.toContain('test-gemini-key');
  });

  it('requires a server-side Gemini key', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'GEMINI_API_KEY' ? undefined : 'gemini-3.5-flash-lite',
    );
    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).rejects.toThrow('AI provider is not configured.');
  });

  it('translates provider rate limits into a retryable HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED' } }),
    }) as unknown as typeof fetch;

    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('retries a transient Gemini server error and succeeds on the next attempt', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { status: 'UNAVAILABLE' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"type":"EXPENSE"}' }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).resolves.toBe('{"type":"EXPENSE"}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty provider response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }],
      }),
    }) as unknown as typeof fetch;

    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).rejects.toThrow('AI provider returned no usable text (finish reason: MAX_TOKENS).');
  });
});
