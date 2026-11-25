import { ConfigService } from '@nestjs/config';
import { OpenRouterProvider } from './openrouter.provider';

describe('OpenRouterProvider', () => {
  const originalFetch = global.fetch;
  let config: { get: jest.Mock };
  let provider: OpenRouterProvider;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          OPENROUTER_API_KEY: 'test-openrouter-key',
          AI_MODEL: 'nvidia/nemotron-3.5-super-vl:free',
          AI_REQUEST_TIMEOUT_MS: '30000',
          APP_URL: 'https://trellisflow.vercel.app',
        };
        return values[key] ?? fallback;
      }),
    };
    provider = new OpenRouterProvider(config as unknown as ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sends text and receipt images through the OpenRouter chat completions API', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'nvidia/nemotron-3.5-super-vl:free',
        choices: [{ message: { content: '{"type":"EXPENSE"}' } }],
        usage: { prompt_tokens: 140, completion_tokens: 35 },
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
      model: 'nvidia/nemotron-3.5-super-vl:free',
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer test-openrouter-key',
          'HTTP-Referer': 'https://trellisflow.vercel.app',
          'X-Title': 'TrellisFlow',
        }),
      }),
    );
    const body = JSON.parse(options.body);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[1].content[1].image_url.url).toBe('data:image/png;base64,aGVsbG8=');
  });

  it('requires a server-side OpenRouter key', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'OPENROUTER_API_KEY' ? undefined : 'nvidia/nemotron-3.5-super-vl:free',
    );
    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).rejects.toThrow('AI provider is not configured.');
  });

  it('translates provider rate limits into a retryable HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'rate limited' } }),
    }) as unknown as typeof fetch;

    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('rejects an empty provider response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    }) as unknown as typeof fetch;

    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).rejects.toThrow('AI provider returned an empty response.');
  });
});
