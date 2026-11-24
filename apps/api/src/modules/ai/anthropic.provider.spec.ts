import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicProvider } from './anthropic.provider';

describe('AnthropicProvider', () => {
  const originalFetch = global.fetch;
  let config: { get: jest.Mock };
  let provider: AnthropicProvider;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          ANTHROPIC_API_KEY: 'test-api-key',
          ANTHROPIC_MODEL: 'claude-sonnet-4-5',
          AI_REQUEST_TIMEOUT_MS: '20000',
        };
        return values[key] ?? fallback;
      }),
    };
    provider = new AnthropicProvider(config as unknown as ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('requires server-side API credentials and a configured model', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'ANTHROPIC_API_KEY' ? undefined : 'claude-sonnet-4-5',
    );

    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sends text and base64 receipt images to the Messages API', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '{"type":"EXPENSE"}' }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await provider.generate({
      systemPrompt: 'Extract facts',
      userPrompt: 'Read the receipt',
      images: [{ mediaType: 'image/png', data: 'aGVsbG8=' }],
      maxOutputTokens: 800,
    });

    expect(result).toBe('{"type":"EXPENSE"}');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key',
          'anthropic-version': '2026-10-21',
        }),
        body: expect.stringContaining('"media_type":"image/png"'),
      }),
    );
  });

  it('rejects an empty text response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [] }),
    }) as unknown as typeof fetch;

    await expect(
      provider.generate({ systemPrompt: 'system', userPrompt: 'hello' }),
    ).rejects.toThrow('AI provider returned an empty response.');
  });
});
